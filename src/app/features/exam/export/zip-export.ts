import type { Exam } from '../../../models/exam';
import type { ReportModel } from './report-model';

export interface ZipRecording {
  promptId: string;
  partId: string;
  blob: Blob;
}

export function audioExtension(type: string): string {
  if (type.includes('mp4') || type.includes('aac')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mpeg')) return 'mp3';
  return 'webm';
}

export const ZIP_README = `Learn English: practice export

exam.json     The original exam, including the answer key.
answers.json  Your saved answers, scores, writing texts, self-assessment and speaking transcripts.
results.pdf   The full report (same as "Full report" in the app).
recordings/   Your speaking recordings stored on this device, if there are any.

Scores cover Reading and Listening only. Writing and Speaking are not marked, and speaking
transcripts are browser speech recognition output. This is practice material, not an official result.
`;

/** The JSON with the learner's data (not the exam itself). */
export function buildAnswersJson(
  model: ReportModel,
  files: ReadonlyMap<string, string>,
): Record<string, unknown> {
  const { input } = model;
  return {
    examId: input.exam.id,
    examTitle: input.exam.title,
    attempt: { id: input.attemptId, number: input.attemptNumber, date: input.date },
    exportedAt: input.exportedAt.toISOString(),
    studentName: input.studentName,
    scores: Object.fromEntries(
      model.reports.map((r) => [
        r.skill,
        {
          correct: r.score.correct,
          total: r.score.total,
          answered: r.score.answered,
          percent: r.percent,
        },
      ]),
    ),
    writing: model.writing.map((w) => ({
      partId: w.summary.partId,
      task: w.summary.task.title,
      text: w.summary.text,
      words: w.summary.words,
      rubric: w.summary.rubric,
      checkerNotes: w.issues.length,
    })),
    speaking: model.speaking.flatMap((sp) =>
      sp.prompts.map((p) => ({
        part: sp.part.id,
        id: p.id,
        prompt: p.label,
        transcript: p.transcript,
        seconds: p.seconds,
        recording: files.get(p.id) ?? null,
      })),
    ),
    allAnswers: input.data.answers,
  };
}

/** Packs the exam, answers, report and recordings. fflate is imported only here. */
export async function buildZip(
  exam: Exam,
  model: ReportModel,
  pdf: Blob,
  recordings: readonly ZipRecording[],
): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate');
  const files = new Map<string, string>();
  const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  const text = (name: string, value: string) => (entries[name] = [strToU8(value), { level: 6 }]);
  for (const r of recordings) {
    const name = `recordings/${r.partId}-${r.promptId}.${audioExtension(r.blob.type)}`;
    files.set(r.promptId, name);
    entries[name] = [new Uint8Array(await r.blob.arrayBuffer()), { level: 0 }];
  }
  text('exam.json', JSON.stringify(exam, null, 2));
  text('answers.json', JSON.stringify(buildAnswersJson(model, files), null, 2));
  text('README.txt', ZIP_README);
  entries['results.pdf'] = [new Uint8Array(await pdf.arrayBuffer()), { level: 0 }];
  const bytes = zipSync(entries);
  return new Blob([bytes as BlobPart], { type: 'application/zip' });
}
