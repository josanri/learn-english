import type { ChoiceQuestion, PracticeExam } from '../types/exam';
import type { Answers, Result } from '../types/session';
import { countWords } from './text';
import { loadAudioClip } from './persistence';

type ArchiveEntry = { name: string; bytes: Uint8Array };

const ZIP_MIME_TYPE = 'application/zip';
const TEXT_ENCODER = new TextEncoder();

export function downloadResultPdf(exam: PracticeExam, answers: Answers, result?: Result) {
  const blob = createPdf(exam, answers, result);
  downloadBlob(blob, `${safeFileName(exam.title)}-results.pdf`);
}

export async function downloadResultZip(exam: PracticeExam, answers: Answers, result?: Result) {
  const paper = createPdf(exam, answers, result);
  const recordingIds = exam.speaking.flatMap(part => [
    ...(part.questions ?? []).map(question => question.id),
    ...(part.images ?? []).map(image => image.id),
  ]);
  const responseItems = exam.speaking.flatMap(part => [
    ...(part.questions ?? []).map(question => ({ id: question.id, part: part.part, prompt: question.prompt })),
    ...(part.images ?? []).map(image => ({ id: image.id, part: part.part, prompt: part.prompt ?? image.alt, image: image.title })),
  ]);
  const recordingFiles = new Map<string, string>();
  const archive: ArchiveEntry[] = [
    { name: 'exam.json', bytes: TEXT_ENCODER.encode(JSON.stringify(exam, null, 2)) },
    { name: 'results.pdf', bytes: new Uint8Array(await paper.arrayBuffer()) },
    { name: 'README.txt', bytes: TEXT_ENCODER.encode('B1 practice paper export\nIncludes the original exam and answer key, your saved responses, the result PDF, and any locally stored speaking recordings.\nSpeaking transcripts are browser recognition output and are not an official Cambridge score.\n') },
  ];

  for (const id of recordingIds) {
    try {
      const audio = await loadAudioClip(`${exam.id}:${id}`);
      if (audio) {
        const fileName = `recordings/${id}.${audioExtension(audio.type)}`;
        archive.push({ name: fileName, bytes: new Uint8Array(await audio.arrayBuffer()) });
        recordingFiles.set(id, fileName);
      }
    } catch { /* A missing or unavailable local recording does not block the rest of the export. */ }
  }

  const responses = responseItems.map(item => ({
    ...item,
    transcript: String(answers[`speaking:${item.id}`] ?? ''),
    recording: recordingFiles.get(item.id) ?? null,
  }));
  const answerBundle = {
    examId: exam.id,
    examTitle: exam.title,
    exportedAt: new Date().toISOString(),
    objectiveScore: result ?? null,
    writing: {
      part1: { task: exam.writing.part1, response: String(answers['writing-1'] ?? '') },
      part2: {
        selectedTask: String(answers['writing-2-type'] ?? 'article'),
        response: String(answers['writing-2'] ?? ''),
      },
    },
    speaking: responses,
    allAnswers: answers,
  };
  archive.splice(1, 0, { name: 'answers.json', bytes: TEXT_ENCODER.encode(JSON.stringify(answerBundle, null, 2)) });

  downloadBlob(new Blob([createZip(archive)], { type: ZIP_MIME_TYPE }), `${safeFileName(exam.title)}-results.zip`);
}

type PdfColour = readonly [number, number, number];
type PdfPage = { commands: string[]; y: number };
const PDF_COLOURS = {
  ink: [0.12, 0.18, 0.25] as PdfColour,
  muted: [0.39, 0.46, 0.53] as PdfColour,
  blue: [0.20, 0.34, 0.62] as PdfColour,
  pale: [0.95, 0.96, 0.98] as PdfColour,
  line: [0.86, 0.89, 0.92] as PdfColour,
  green: [0.12, 0.42, 0.32] as PdfColour,
  white: [1, 1, 1] as PdfColour,
};
const PDF_PAGE_HEIGHT = 792;
const PDF_LEFT = 48;
const PDF_CONTENT_WIDTH = 516;

function createPdf(exam: PracticeExam, answers: Answers, result?: Result): Blob {
  const pages: PdfPage[] = [];
  const newPage = () => {
    const page: PdfPage = { commands: [], y: 0 };
    pages.push(page);
    pdfRect(page, 0, 0, 612, PDF_PAGE_HEIGHT, PDF_COLOURS.white);
    pdfRect(page, 0, 0, 612, 9, PDF_COLOURS.blue);
    pdfText(page, 'NORTHSTAR  /  B1 ENGLISH PRACTICE', PDF_LEFT, 38, 8, PDF_COLOURS.blue, true);
    pdfText(page, exam.title.toUpperCase(), PDF_LEFT, 57, 8, PDF_COLOURS.muted, false);
    pdfLine(page, PDF_LEFT, 70, 564, 70, PDF_COLOURS.line);
    page.y = 95;
    return page;
  };
  let page = newPage();
  const ensureRoom = (height: number) => { if (page.y + height > 735) page = newPage(); };
  const addSection = (title: string, subtitle?: string) => {
    ensureRoom(subtitle ? 58 : 40);
    pdfText(page, title.toUpperCase(), PDF_LEFT, page.y, 10, PDF_COLOURS.blue, true);
    page.y += 12;
    pdfLine(page, PDF_LEFT, page.y, 564, page.y, PDF_COLOURS.line);
    page.y += 17;
    if (subtitle) { addWrappedText(subtitle, PDF_COLOURS.muted, 9); page.y += 6; }
  };
  const addWrappedText = (value: string, colour = PDF_COLOURS.ink, size = 9, x = PDF_LEFT + 12, maxChars = 88) => {
    const paragraphs = value.split(/\r?\n/);
    const lines = paragraphs.flatMap(paragraph => wrapPdfLine(toPdfText(paragraph), maxChars));
    const lineHeight = size + 4;
    ensureRoom(Math.max(1, lines.length) * lineHeight + 5);
    for (const line of lines) { pdfText(page, line || ' ', x, page.y, size, colour, false); page.y += lineHeight; }
  };
  const addCard = (title: string, details: { label: string; value: string; colour?: PdfColour }[]) => {
    const wrapped = details.map(detail => ({ ...detail, lines: wrapPdfLine(toPdfText(detail.value || 'Not answered'), 76) }));
    const height = 45 + wrapped.reduce((sum, detail) => sum + detail.lines.length * 12 + 17, 0);
    ensureRoom(height + 9);
    pdfRect(page, PDF_LEFT, page.y - 3, PDF_CONTENT_WIDTH, height, PDF_COLOURS.pale);
    pdfText(page, toPdfText(title), PDF_LEFT + 13, page.y + 13, 9, PDF_COLOURS.ink, true);
    page.y += 30;
    for (const detail of wrapped) {
      pdfText(page, toPdfText(detail.label.toUpperCase()), PDF_LEFT + 13, page.y, 6.5, PDF_COLOURS.muted, true);
      page.y += 11;
      for (const line of detail.lines) { pdfText(page, line || ' ', PDF_LEFT + 13, page.y, 8.5, detail.colour ?? PDF_COLOURS.ink, false); page.y += 12; }
      page.y += 6;
    }
    page.y += 11;
  };
  const addChoiceCard = (question: ChoiceQuestion, label: string) => {
    const chosenIndex = Number(answers[question.id]);
    const selectedOption = Number.isInteger(chosenIndex) && chosenIndex >= 0 ? question.options[chosenIndex] : undefined;
    const choice = selectedOption === undefined ? 'Not answered' : formatOption(selectedOption, chosenIndex);
    const key = formatOption(question.options[question.answer] ?? '—', question.answer);
    addCard(label, [
      { label: 'Question', value: question.prompt },
      { label: 'Your answer', value: choice },
      { label: 'Answer key', value: key, colour: PDF_COLOURS.green },
    ]);
  };
  const addGapCard = (title: string, answer: string, key: string) => addCard(title, [
    { label: 'Your answer', value: answer || 'Not answered' },
    { label: 'Answer key', value: key || '—', colour: PDF_COLOURS.green },
  ]);

  const score = result?.correct ?? 0;
  const total = result?.total ?? 0;
  pdfText(page, 'PERSONAL RESULTS REPORT', PDF_LEFT, 126, 8, PDF_COLOURS.muted, true);
  pdfText(page, toPdfText(exam.title), PDF_LEFT, 161, 26, PDF_COLOURS.ink, true);
  const subtitleLines = wrapPdfLine(toPdfText(exam.subtitle), 76);
  subtitleLines.forEach((line, index) => pdfText(page, line, PDF_LEFT, 184 + index * 14, 10, PDF_COLOURS.muted, false));
  pdfRect(page, PDF_LEFT, 222, PDF_CONTENT_WIDTH, 126, PDF_COLOURS.pale);
  pdfText(page, 'READING + LISTENING', PDF_LEFT + 18, 248, 8, PDF_COLOURS.blue, true);
  pdfText(page, `${score} / ${total}`, PDF_LEFT + 18, 292, 30, PDF_COLOURS.ink, true);
  pdfText(page, `${total ? Math.round((score / total) * 100) : 0}% correct`, PDF_LEFT + 170, 287, 11, PDF_COLOURS.green, true);
  pdfText(page, `Completed  ${result?.completedAt ? new Date(result.completedAt).toLocaleString('en-GB') : 'Not recorded'}`, PDF_LEFT + 18, 327, 8, PDF_COLOURS.muted, false);
  pdfText(page, 'This report includes your saved answers and answer keys. Writing and speaking are for self-review.', PDF_LEFT, 382, 8.5, PDF_COLOURS.muted, false);
  page.y = 430;

  addSection('Reading', 'Your response is shown alongside the answer key for each item.');
  for (const part of exam.reading) {
    addSection(`Part ${part.part}  /  ${part.title}`);
    for (const question of part.questions ?? []) addChoiceCard(question, question.prompt);
    for (const [index, gap] of (part.gaps ?? []).entries()) addGapCard(`Question ${index + 1}`, answerText(answers[gap.id]), gap.answer);
  }
  addSection('Writing', 'Writing is not automatically marked. Use the prompts and saved drafts to review your work.');
  addCard('Part 1  /  Email', [
    { label: 'Word count', value: `${countWords(String(answers['writing-1'] ?? ''))} words`, colour: PDF_COLOURS.muted },
    { label: 'Your response', value: String(answers['writing-1'] ?? '') || 'No response saved.' },
  ]);
  const writingType = String(answers['writing-2-type'] ?? 'article');
  addCard(`Part 2  /  ${writingType}`, [
    { label: 'Word count', value: `${countWords(String(answers['writing-2'] ?? ''))} words`, colour: PDF_COLOURS.muted },
    { label: 'Your response', value: String(answers['writing-2'] ?? '') || 'No response saved.' },
  ]);
  addSection('Listening', 'Your response is shown alongside the answer key for each item.');
  for (const part of exam.listening) {
    addSection(`Part ${part.part}  /  ${part.title}`);
    const questions = part.clips?.map(clip => clip.question) ?? part.questions ?? [];
    for (const question of questions) addChoiceCard(question, question.prompt);
    for (const [index, gap] of (part.gaps ?? []).entries()) addGapCard(gap.prompt || `Question ${index + 1}`, answerText(answers[gap.id]), gap.answer);
  }
  addSection('Speaking', 'Speaking transcripts are browser recognition output. They are not a Cambridge score.');
  for (const part of exam.speaking) {
    addSection(`Part ${part.part}  /  ${part.title}`);
    for (const question of part.questions ?? []) addCard(question.prompt, [{ label: 'Transcript', value: String(answers[`speaking:${question.id}`] ?? '') || 'No transcript recorded.' }]);
    for (const image of part.images ?? []) addCard(image.title, [
      { label: 'Task', value: part.prompt ?? image.alt, colour: PDF_COLOURS.muted },
      { label: 'Transcript', value: String(answers[`speaking:${image.id}`] ?? '') || 'No transcript recorded.' },
    ]);
  }
  for (const [index, reportPage] of pages.entries()) {
    pdfLine(reportPage, PDF_LEFT, 755, 564, 755, PDF_COLOURS.line);
    pdfText(reportPage, 'Original practice materials · Not an official Cambridge English paper', PDF_LEFT, 773, 7, PDF_COLOURS.muted, false);
    pdfText(reportPage, `PAGE ${index + 1} / ${pages.length}`, 510, 773, 7, PDF_COLOURS.muted, true);
  }

  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 3 + index * 2);
  const fontId = 3 + pages.length * 2;
  const boldFontId = fontId + 1;
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const stream = page.commands.join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[boldFontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = document.length;
    document += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = document.length;
  document += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) document += `${String(offset).padStart(10, '0')} 00000 n \n`;
  document += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([document], { type: 'application/pdf' });
}

function pdfText(page: PdfPage, value: string, x: number, top: number, size: number, colour: PdfColour, bold: boolean) {
  const y = PDF_PAGE_HEIGHT - top;
  const font = bold ? 'F2' : 'F1';
  page.commands.push(`BT /${font} ${size} Tf ${pdfColour(colour)} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfString(toPdfText(value))}) Tj ET`);
}

function pdfRect(page: PdfPage, x: number, top: number, width: number, height: number, colour: PdfColour) {
  page.commands.push(`q ${pdfColour(colour)} rg ${x} ${PDF_PAGE_HEIGHT - top - height} ${width} ${height} re f Q`);
}

function pdfLine(page: PdfPage, x1: number, top1: number, x2: number, top2: number, colour: PdfColour) {
  page.commands.push(`q ${pdfColour(colour)} RG 0.7 w ${x1} ${PDF_PAGE_HEIGHT - top1} m ${x2} ${PDF_PAGE_HEIGHT - top2} l S Q`);
}

function pdfColour([red, green, blue]: PdfColour) { return `${red} ${green} ${blue}`; }

function formatOption(option: string, index: number) {
  return /^[A-H]$/.test(option) ? option : `${String.fromCharCode(65 + index)}. ${option}`;
}

function wrapPdfLine(line: string, maxChars = 88) {
  const words = line.split(/\s+/).filter(Boolean);
  const output: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && `${current} ${word}`.length > maxChars) { output.push(current); current = ''; }
    current += `${current ? ' ' : ''}${word}`;
  }
  if (current || !output.length) output.push(current);
  return output;
}

function toPdfText(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/·/g, '|').replace(/[^\x20-\x7e]/g, '?');
}

function escapePdfString(value: string) { return value.replace(/([\\()])/g, '\\$1'); }
function answerText(value: string | number | undefined) { return String(value ?? '').trim(); }
function safeFileName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'practice-paper'; }
function audioExtension(type: string) { const extension = type.split('/')[1]?.split(';')[0]; return extension && /^[a-z0-9]+$/.test(extension) ? extension : 'webm'; }

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createZip(entries: ArchiveEntry[]) {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let localOffset = 0;
  const stamp = dosDateTime(new Date());
  for (const entry of entries) {
    const fileName = TEXT_ENCODER.encode(entry.name);
    const crc = crc32(entry.bytes);
    const localHeader = new Uint8Array(30 + fileName.length);
    const local = new DataView(localHeader.buffer);
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true); local.setUint16(10, stamp.time, true); local.setUint16(12, stamp.date, true);
    local.setUint32(14, crc, true); local.setUint32(18, entry.bytes.length, true); local.setUint32(22, entry.bytes.length, true);
    local.setUint16(26, fileName.length, true); local.setUint16(28, 0, true); localHeader.set(fileName, 30);
    localChunks.push(localHeader, entry.bytes);

    const centralHeader = new Uint8Array(46 + fileName.length);
    const central = new DataView(centralHeader.buffer);
    central.setUint32(0, 0x02014b50, true); central.setUint16(4, 20, true); central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true); central.setUint16(10, 0, true); central.setUint16(12, stamp.time, true); central.setUint16(14, stamp.date, true);
    central.setUint32(16, crc, true); central.setUint32(20, entry.bytes.length, true); central.setUint32(24, entry.bytes.length, true);
    central.setUint16(28, fileName.length, true); central.setUint16(30, 0, true); central.setUint16(32, 0, true);
    central.setUint16(34, 0, true); central.setUint16(36, 0, true); central.setUint32(38, 0, true); central.setUint32(42, localOffset, true);
    centralHeader.set(fileName, 46); centralChunks.push(centralHeader);
    localOffset += localHeader.length + entry.bytes.length;
  }
  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, entries.length, true); endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true); endView.setUint32(16, localOffset, true);
  return concatenate([...localChunks, ...centralChunks, end]);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function concatenate(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}
