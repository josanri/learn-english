import type {
  Exam,
  Part,
  Section,
  Skill,
  SpeakingPart,
  SpeakingVisual,
  WritingSection,
} from '../../../models/exam';
import type { AttemptData, ExamSession } from '../../../models/storage';
import { analyzeSpeech, type SpeechMetrics } from '../../../core/speech-metrics';
import { analyzeTask } from '../../../core/writing/task-check';
import type { ChecklistItem, Issue } from '../../../core/writing/types';
import { MARKED_SKILLS, buildSectionReport, type SectionReport } from '../engine/report';
import { percent, type Answers } from '../engine/scoring';
import { partPrompts } from '../parts/part-registry';
import { durationKey, speakingPrompts, topicKey, transcriptKey } from '../parts/speaking-prompts';
import {
  RUBRIC,
  taskSpec,
  writingSummary,
  type WritingPartSummary,
} from '../parts/writing-prompts';

/** "answers": a short answer sheet. "full": questions, explanations, writing and speaking detail. */
export type ReportMode = 'answers' | 'full';

export interface ReportOptions {
  mode: ReportMode;
  /** Full report only: append the reading texts and listening scripts. */
  includeSources: boolean;
}

export const BOARD_NAMES: Record<string, string> = {
  'cambridge-pet': 'Cambridge B1 Preliminary (PET)',
  eoi: 'EOI B1 (Spain)',
  'trinity-ise1': 'Trinity ISE I',
  'aptis-b1': 'Aptis B1',
  'languagecert-b1': 'LanguageCert B1',
  'oxford-test-b1': 'Oxford Test of English (B1)',
};

export const SKILL_LABELS: Record<Skill, string> = {
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
  mediation: 'Mediation',
};

/** Everything the report needs that does not come from the exam file itself. */
export interface ReportInput {
  exam: Exam;
  attemptLabel: string;
  attemptNumber: number;
  /** Id used for the recordings in IndexedDB (`<examId>-<n>`). */
  attemptId: string;
  /** True for the attempt in progress (only that one remembers time spent and flagged items). */
  current: boolean;
  data: AttemptData;
  /** ISO date of the last activity of the attempt. */
  date: string;
  studentName: string;
  session?: ExamSession | null;
  /** Item ids that have a saved recording. */
  recordings: ReadonlySet<string>;
  /** Thumbnails (data URLs, JPEG or PNG) by visual id. Missing or null: draw a placeholder. */
  images: Readonly<Record<string, string | null>>;
  /** Issues of the writing checker for a text. */
  issuesFor: (text: string) => Issue[];
  /** Used on the cover. */
  exportedAt: Date;
}

export type SkillStatus = 'completed' | 'in-progress' | 'not-started';

export interface SkillSummary {
  skill: Skill;
  label: string;
  status: SkillStatus;
  /** Marked skills (reading, listening) have a score; the others a completion count. */
  marked: boolean;
  correct: number;
  total: number;
  answered: number;
  /** Ring value 0..1. */
  fraction: number;
  /** Big text under the ring: "72%" or "2 of 3". */
  headline: string;
  caption: string;
  seconds: number | null;
  limitMinutes: number;
  flagged: number;
}

export interface WrappedLine {
  n: number;
  text: string;
  /** Offsets in the original text. */
  start: number;
  end: number;
}

export interface WritingModel {
  summary: WritingPartSummary;
  lines: WrappedLine[];
  issues: Issue[];
  checklist: ChecklistItem[];
}

export interface SpeakingPromptModel {
  id: string;
  label: string;
  transcript: string;
  seconds: number | null;
  metrics: SpeechMetrics | null;
  recorded: boolean;
  visual: SpeakingVisual | null;
  thumbnail: string | null;
}

export interface SpeakingPartModel {
  part: SpeakingPart;
  context: string[];
  topic: string | null;
  prompts: SpeakingPromptModel[];
}

export interface SourceBlock {
  partTitle: string;
  heading?: string;
  text: string;
}

export interface ReportModel {
  input: ReportInput;
  options: ReportOptions;
  title: string;
  formatName: string;
  skills: SkillSummary[];
  reports: SectionReport[];
  writing: WritingModel[];
  speaking: SpeakingPartModel[];
  flaggedIds: ReadonlySet<string>;
  sources: { skill: Skill; blocks: SourceBlock[] }[];
  totals: { correct: number; total: number; percent: number | null };
}

// ---------------------------------------------------------------------------------------------
// Text layout of the written answer
// ---------------------------------------------------------------------------------------------

/**
 * Breaks a text into lines of at most `width` characters (monospace layout, so the numbering is
 * exact). Paragraph breaks are kept; offsets point into `text`.
 */
export function wrapLines(text: string, width: number): WrappedLine[] {
  const out: WrappedLine[] = [];
  let offset = 0;
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim().length === 0) {
      out.push({ n: 0, text: '', start: offset, end: offset });
    } else {
      let from = 0;
      while (from < paragraph.length) {
        let to = Math.min(from + width, paragraph.length);
        if (to < paragraph.length) {
          const space = paragraph.lastIndexOf(' ', to);
          if (space > from) to = space;
        }
        const raw = paragraph.slice(from, to);
        out.push({ n: 0, text: raw, start: offset + from, end: offset + to });
        from = to;
        while (paragraph[from] === ' ') from++;
      }
    }
    offset += paragraph.length + 1;
  }
  return out.map((line, i) => ({ ...line, n: i + 1 }));
}

/** Number of the line that holds a character offset. */
export function lineOf(lines: readonly WrappedLine[], offset: number): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (offset >= lines[i]!.start) return lines[i]!.n;
  }
  return 1;
}

export interface Segment {
  text: string;
  marked: boolean;
}

/** Splits one line into plain and underlined (issue) segments. */
export function lineSegments(line: WrappedLine, text: string, issues: readonly Issue[]): Segment[] {
  const ranges = issues
    .filter((i) => i.end > line.start && i.start < line.end)
    .map((i) => [Math.max(i.start, line.start), Math.min(i.end, line.end)] as const)
    .sort((a, b) => a[0] - b[0]);
  const out: Segment[] = [];
  let at = line.start;
  for (const [s, e] of ranges) {
    if (e <= at) continue;
    const from = Math.max(s, at);
    if (from > at) out.push({ text: text.slice(at, from), marked: false });
    out.push({ text: text.slice(from, e), marked: true });
    at = e;
  }
  if (at < line.end) out.push({ text: text.slice(at, line.end), marked: false });
  return out;
}

// ---------------------------------------------------------------------------------------------
// Source texts (annex)
// ---------------------------------------------------------------------------------------------

function sourceBlocks(part: Part): SourceBlock[] {
  const title = `Part ${part.number}: ${part.title}`;
  const block = (text: string, heading?: string): SourceBlock => ({
    partTitle: title,
    ...(heading ? { heading } : {}),
    text,
  });
  const script = (
    turns: { speaker: string; text: string }[],
    speakers: { id: string; name: string }[],
  ) =>
    turns
      .map((t) => `${speakers.find((s) => s.id === t.speaker)?.name ?? t.speaker}: ${t.text}`)
      .join('\n');
  switch (part.type) {
    case 'notices':
      return part.notices.map((n, i) => block(n, `Notice ${i + 1}`));
    case 'matching':
      return [
        ...part.people.map((p) => block(p.text, `Person ${p.id}`)),
        ...part.texts.map((t) => block(t.text, `${t.id}. ${t.title}`)),
      ];
    case 'multiple-choice':
    case 'multiple-choice-cloze':
    case 'open-cloze':
    case 'true-false-notgiven':
      return [block(part.passage)];
    case 'gapped-text':
      return [
        block(part.passage),
        block(
          part.sentences.map((s, i) => `${String.fromCharCode(65 + i)}. ${s}`).join('\n'),
          'Sentences',
        ),
      ];
    case 'gap-fill-word-bank':
      return [block(part.passage), block(part.wordBank.join(', '), 'Word bank')];
    case 'sentence-completion':
      return part.passage ? [block(part.passage)] : [];
    case 'heading-matching':
      return [
        ...part.paragraphs.map((p, i) => block(p.text, `Paragraph ${i + 1}`)),
        block(
          part.headings.map((h, i) => `${String.fromCharCode(65 + i)}. ${h}`).join('\n'),
          'Headings',
        ),
      ];
    case 'short-dialogues':
    case 'gist-dialogues':
      return part.clips.map((c, i) =>
        block(script(c.recording.turns, c.recording.speakers), `Recording ${i + 1}`),
      );
    case 'note-completion':
    case 'listening-interview':
    case 'listening-multiple-choice':
    case 'listening-true-false':
    case 'opinion-matching':
      return [block(script(part.recording.turns, part.recording.speakers))];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------------------------

function status(data: AttemptData, skill: Skill, anyAnswer: boolean): SkillStatus {
  const s = data.sectionStatus[skill];
  if (s === 'completed') return 'completed';
  return s === 'in-progress' || anyAnswer ? 'in-progress' : 'not-started';
}

function sectionPromptIds(section: Section): string[] {
  return (section.parts as Part[]).flatMap((p) => partPrompts(p).map((x) => x.id));
}

export function buildReportModel(input: ReportInput, options: ReportOptions): ReportModel {
  const { exam, data } = input;
  const answers: Answers = data.answers;
  const flaggedIds = new Set(input.session?.flagged ?? []);
  const reports: SectionReport[] = [];
  const skills: SkillSummary[] = [];
  const writing: WritingModel[] = [];
  const speaking: SpeakingPartModel[] = [];

  for (const section of exam.sections) {
    const skill = section.skill;
    const seconds = input.current ? (input.session?.elapsed[skill] ?? null) : null;
    const base = {
      skill,
      label: SKILL_LABELS[skill],
      seconds,
      limitMinutes: section.timeLimitMinutes,
    };
    if (MARKED_SKILLS.includes(skill)) {
      const report = buildSectionReport(section, answers);
      reports.push(report);
      const flagged = report.parts.reduce(
        (n, p) => n + p.items.filter((i) => flaggedIds.has(i.item.id)).length,
        0,
      );
      const st = status(data, skill, report.score.answered > 0);
      skills.push({
        ...base,
        status: st,
        marked: true,
        correct: report.score.correct,
        total: report.score.total,
        answered: report.score.answered,
        fraction: report.score.total ? report.score.correct / report.score.total : 0,
        headline: `${report.percent}%`,
        caption: `${report.score.correct} of ${report.score.total} correct`,
        flagged,
      });
    } else if (skill === 'writing') {
      const summaries = writingSummary(section as WritingSection, answers);
      const done = summaries.filter((s) => s.words > 0).length;
      for (const summary of summaries) {
        const issues = input.issuesFor(summary.text);
        writing.push({
          summary,
          lines: summary.text.trim() ? wrapLines(summary.text, WRITING_LINE_WIDTH) : [],
          issues,
          checklist: analyzeTask(summary.text, taskSpec(summary.task)),
        });
      }
      skills.push({
        ...base,
        status: status(data, skill, done > 0),
        marked: false,
        correct: done,
        total: summaries.length,
        answered: done,
        fraction: summaries.length ? done / summaries.length : 0,
        headline: `${done} of ${summaries.length}`,
        caption: `tasks written, ${summaries.reduce((n, s) => n + s.words, 0)} words`,
        flagged: 0,
      });
    } else if (skill === 'speaking') {
      const ids = sectionPromptIds(section);
      const done = ids.filter((id) => hasSpeaking(answers, id, input.recordings)).length;
      for (const part of section.parts as SpeakingPart[]) {
        speaking.push(speakingModel(part, answers, input));
      }
      skills.push({
        ...base,
        status: status(data, skill, done > 0),
        marked: false,
        correct: done,
        total: ids.length,
        answered: done,
        fraction: ids.length ? done / ids.length : 0,
        headline: `${done} of ${ids.length}`,
        caption: 'tasks answered',
        flagged: 0,
      });
    } else {
      skills.push({
        ...base,
        status: status(data, skill, false),
        marked: false,
        correct: 0,
        total: 0,
        answered: 0,
        fraction: 0,
        headline: '–',
        caption: 'not in this report',
        flagged: 0,
      });
    }
  }

  const markedDone = reports.filter((r) => r.score.answered > 0 || r.score.total === 0);
  const correct = markedDone.reduce((n, r) => n + r.score.correct, 0);
  const total = markedDone.reduce((n, r) => n + r.score.total, 0);

  const sources = options.includeSources
    ? exam.sections
        .filter((s) => MARKED_SKILLS.includes(s.skill))
        .map((s) => ({
          skill: s.skill,
          blocks: (s.parts as Part[]).flatMap((p) => sourceBlocks(p)),
        }))
        .filter((s) => s.blocks.length > 0)
    : [];

  return {
    input,
    options,
    title: exam.title,
    formatName: BOARD_NAMES[String(exam.board)] ?? String(exam.board),
    skills: skills.filter((s) => s.skill !== 'mediation' || s.status !== 'not-started'),
    reports,
    writing,
    speaking,
    flaggedIds,
    sources,
    totals: { correct, total, percent: total > 0 ? percent({ correct, total }) : null },
  };
}

/** Characters per line of the written answer in the PDF (monospace 8.5 pt on A4). */
export const WRITING_LINE_WIDTH = 78;

function hasSpeaking(answers: Answers, id: string, recordings: ReadonlySet<string>): boolean {
  const t = answers[transcriptKey(id)];
  return (typeof t === 'string' && t.trim().length > 0) || recordings.has(id);
}

function speakingModel(
  part: SpeakingPart,
  answers: Answers,
  input: ReportInput,
): SpeakingPartModel {
  const context: string[] = [];
  let topic: string | null = null;
  switch (part.type) {
    case 'photo-description':
    case 'collaborative-task':
      context.push(part.prompt);
      break;
    case 'role-play':
      context.push(part.situation, part.roleDescription, ...part.cues.map((c) => `- ${c}`));
      break;
    case 'monologue-topic': {
      const chosen = answers[topicKey(part.id)];
      topic = part.topics.find((t) => t.id === chosen)?.prompt ?? null;
      break;
    }
    default:
      break;
  }
  const visuals = 'images' in part ? part.images : [];
  const prompts = speakingPrompts(part).map((p): SpeakingPromptModel => {
    const raw = answers[transcriptKey(p.id)];
    const transcript = typeof raw === 'string' ? raw.trim() : '';
    const dur = answers[durationKey(p.id)];
    const seconds = typeof dur === 'number' && dur > 0 ? dur : null;
    const visual = visuals.find((v) => v.id === p.id) ?? null;
    return {
      id: p.id,
      label: p.label,
      transcript,
      seconds,
      metrics: transcript ? analyzeSpeech(transcript, seconds) : null,
      recorded: input.recordings.has(p.id),
      visual,
      thumbnail: visual ? (input.images[visual.id] ?? null) : null,
    };
  });
  return { part, context, topic, prompts };
}

export { RUBRIC };
