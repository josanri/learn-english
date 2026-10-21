import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Exam } from '../../../models/exam';
import { buildAnswersJson } from './zip-export';
import { buildDocument, clean, formatDuration } from './pdf-document';
import {
  buildReportModel,
  lineOf,
  lineSegments,
  wrapLines,
  type ReportInput,
  type ReportOptions,
} from './report-model';
import { safeFileName } from './result-export.service';
import { pdfFonts } from './pdf-render';

const EXAMS_DIR = join(process.cwd(), 'src', 'assets', 'exams', 'b1');

function loadExams(): Exam[] {
  return readdirSync(EXAMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(EXAMS_DIR, d.name))
        .filter((f) => f.endsWith('.json') && f !== 'index.json')
        .map((f) => JSON.parse(readFileSync(join(EXAMS_DIR, d.name, f), 'utf8')) as Exam),
    );
}

function input(exam: Exam, answers: Record<string, string | number>): ReportInput {
  return {
    exam,
    attemptLabel: 'Attempt 1',
    attemptNumber: 1,
    attemptId: `${exam.id}-1`,
    current: true,
    data: { answers, results: {}, startedAt: '2026-01-01T00:00:00Z', sectionStatus: {} },
    date: '2026-01-02T10:00:00Z',
    studentName: 'Zoë Núñez',
    session: null,
    recordings: new Set(),
    images: {},
    issuesFor: () => [],
    exportedAt: new Date('2026-01-03T00:00:00Z'),
  };
}

describe('wrapLines', () => {
  it('wraps at spaces, keeps paragraphs and numbers lines from 1', () => {
    const lines = wrapLines('Hello there my friend\n\nBye', 12);
    expect(lines.map((l) => l.text)).toEqual(['Hello there', 'my friend', '', 'Bye']);
    expect(lines.map((l) => l.n)).toEqual([1, 2, 3, 4]);
  });

  it('keeps offsets into the original text', () => {
    const text = 'one two three four';
    const lines = wrapLines(text, 8);
    for (const line of lines) expect(text.slice(line.start, line.end)).toBe(line.text);
  });

  it('splits words longer than the line', () => {
    const lines = wrapLines('abcdefghij', 4);
    expect(lines.map((l) => l.text)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('finds the line of an offset and segments marked ranges', () => {
    const text = 'aaa bbb\nccc ddd';
    const lines = wrapLines(text, 20);
    expect(lineOf(lines, 9)).toBe(2);
    const issue = {
      id: 'x',
      ruleId: 'x',
      group: 'grammar' as const,
      severity: 'error' as const,
      source: 'rules' as const,
      category: '',
      start: 4,
      end: 7,
      original: 'bbb',
      message: '',
      suggestions: [],
    };
    expect(lineSegments(lines[0]!, text, [issue])).toEqual([
      { text: 'aaa ', marked: false },
      { text: 'bbb', marked: true },
    ]);
  });
});

describe('clean', () => {
  it('keeps Spanish and English accents and typographic punctuation', () => {
    expect(clean('Año “nuevo” — ¿qué? café')).toBe('Año “nuevo” — ¿qué? café');
  });

  it('replaces glyphs the fonts do not have', () => {
    expect(clean('ok ✓ ő')).toBe('ok ? o');
    expect(clean('a​b')).toBe('ab');
  });

  it('formats durations and file names', () => {
    expect(formatDuration(75)).toBe('1:15');
    expect(safeFileName('A Fresh Start: Año 1')).toBe('a-fresh-start-ano-1');
  });
});

describe('report for every exam', () => {
  const exams = loadExams();
  const modes: ReportOptions[] = [
    { mode: 'full', includeSources: true },
    { mode: 'answers', includeSources: false },
  ];

  it('has exams to test', () => expect(exams.length).toBeGreaterThan(0));

  it('builds a document for an empty attempt and for a partly answered one', () => {
    for (const exam of exams) {
      for (const options of modes) {
        for (const answers of [{}, { [`${exam.id}-x`]: 1, 'writing-1': 'Hi. I likes it.' }]) {
          const model = buildReportModel(input(exam, answers as Record<string, string>), options);
          const doc = buildDocument(model);
          expect(doc.pageSize).toBe('A4');
          expect(Array.isArray(doc.content)).toBe(true);
          expect((doc.content as unknown[]).length).toBeGreaterThan(3);
          expect(model.skills.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('only has fonts that exist as files', () => {
    const fonts = pdfFonts('http://localhost/');
    for (const family of Object.values(fonts)) {
      for (const url of Object.values(family as Record<string, string>)) {
        const file = new URL(url).pathname.split('/').pop()!;
        expect(() =>
          readFileSync(join(process.cwd(), 'src', 'assets', 'fonts', 'pdf', file)),
        ).not.toThrow();
      }
    }
  });

  it('marks reading and listening and counts the written and spoken answers', () => {
    const exam = exams[0]!;
    const answers: Record<string, string | number> = {
      'writing-1': 'Hello Sam. I am happy.',
      'speaking:s1-1-1': 'Well I like weekends because I can rest.',
      'speaking-dur:s1-1-1': 12,
    };
    const model = buildReportModel(input(exam, answers), modes[0]!);
    const writing = model.skills.find((s) => s.skill === 'writing')!;
    const speaking = model.skills.find((s) => s.skill === 'speaking');
    expect(writing.correct).toBeGreaterThanOrEqual(1);
    if (speaking) expect(speaking.total).toBeGreaterThan(0);
    expect(model.reports.map((r) => r.skill)).toEqual(['reading', 'listening']);
    expect(model.totals.percent).toBeNull();
  });

  it('produces an answers.json with the learner data but without the answer key', () => {
    const exam = exams[0]!;
    const model = buildReportModel(input(exam, { 'writing-1': 'Hi' }), modes[0]!);
    const json = buildAnswersJson(model, new Map([['s1-1-1', 'recordings/x.webm']]));
    expect(json['examId']).toBe(exam.id);
    expect(Object.keys(json['scores'] as object)).toEqual(['reading', 'listening']);
    expect(JSON.stringify(json)).not.toContain('"explanation"');
  });
});
