import type { Content, ContentCanvas, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { ReportItem, SectionReport } from '../engine/report';
import { practiceBand } from '../engine/scoring';
import { FALLBACK_SCENE, SCENES } from '../speaking/scene-illustration';
import {
  RUBRIC,
  lineOf,
  lineSegments,
  type ReportModel,
  type SkillSummary,
  type SpeakingPartModel,
  type SpeakingPromptModel,
  type WritingModel,
} from './report-model';

// ---------------------------------------------------------------------------------------------
// Look: the colours of the web app (tokens.css, light theme), fonts embedded by pdf-fonts.ts.
// Everything that carries meaning also has a word or a symbol, so a black and white print is fine.
// ---------------------------------------------------------------------------------------------

const INK = '#0d0d0d';
const MUTED = '#55555b';
const ACCENT = '#0b84f3';
const ACCENT_STRONG = '#0b5fc4';
const SURFACE = '#f5f4f0';
const SURFACE_2 = '#e9e7e0';
const RULE = '#c9c7bf';
const GOOD = '#17703a';
const BAD = '#b3261e';
const WARN = '#8a5300';

const DISPLAY = 'BricolageHeavy';
const MONO = 'Mono';

export const PAGE_MARGIN = 40;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2;

/**
 * pdfmake can only draw glyphs the embedded fonts have (Latin, accents, general punctuation).
 * Anything else is reduced to its base letter when possible, otherwise replaced by a question mark.
 */
/** Code points of the Latin subset of the embedded fonts that the report can use. */
function supported(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (
    c === 0x0a ||
    (c >= 0x20 && c <= 0x7e) ||
    (c >= 0xa0 && c <= 0xff) ||
    c === 0x131 ||
    c === 0x152 ||
    c === 0x153 ||
    (c >= 0x2010 && c <= 0x2027) ||
    (c >= 0x2030 && c <= 0x203a) ||
    c === 0x20ac ||
    c === 0x2122
  );
}

/** Zero-width characters and combining marks are dropped or folded into their letter. */
const INVISIBLE = new RegExp('[\u200B-\u200D\uFEFF]');
const COMBINING = new RegExp('[\u0300-\u036F]', 'g');

export function clean(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  let out = '';
  for (const ch of String(value).replace(/\r\n?/g, '\n')) {
    if (supported(ch)) {
      out += ch;
      continue;
    }
    if (INVISIBLE.test(ch)) continue;
    const base = ch.normalize('NFD').replace(COMBINING, '');
    out += base !== ch && supported(base) ? base : '?';
  }
  return out;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---------------------------------------------------------------------------------------------
// Small drawing helpers (all vector)
// ---------------------------------------------------------------------------------------------

type Mark = 'correct' | 'wrong' | 'blank';

function markIcon(kind: Mark): ContentCanvas {
  if (kind === 'correct') {
    return {
      canvas: [
        {
          type: 'polyline',
          points: [
            { x: 1, y: 6 },
            { x: 4, y: 9.5 },
            { x: 10, y: 1.5 },
          ],
          lineWidth: 2,
          lineColor: GOOD,
          lineCap: 'round',
          lineJoin: 'round',
          closePath: false,
        },
      ],
    };
  }
  if (kind === 'wrong') {
    return {
      canvas: [
        {
          type: 'line',
          x1: 2,
          y1: 2,
          x2: 9,
          y2: 9,
          lineWidth: 2,
          lineColor: BAD,
          lineCap: 'round',
        },
        {
          type: 'line',
          x1: 9,
          y1: 2,
          x2: 2,
          y2: 9,
          lineWidth: 2,
          lineColor: BAD,
          lineCap: 'round',
        },
      ],
    };
  }
  return {
    canvas: [{ type: 'line', x1: 2, y1: 5.5, x2: 9, y2: 5.5, lineWidth: 2, lineColor: MUTED }],
  };
}

function markCell(kind: Mark): Content {
  const label = kind === 'correct' ? 'Correct' : kind === 'wrong' ? 'Wrong' : 'Blank';
  const colour = kind === 'correct' ? GOOD : kind === 'wrong' ? BAD : MUTED;
  return {
    columns: [
      { ...markIcon(kind), width: 13, margin: [0, 1, 0, 0] },
      { text: label, font: MONO, fontSize: 7.5, color: colour, bold: true, width: '*' },
    ],
    columnGap: 2,
  };
}

function bar(fraction: number, width: number, height = 6): ContentCanvas {
  const w = Math.max(0, Math.min(1, fraction)) * width;
  return {
    canvas: [
      { type: 'rect', x: 0, y: 0, w: width, h: height, r: height / 2, color: SURFACE_2 },
      ...(w > 0
        ? [
            {
              type: 'rect' as const,
              x: 0,
              y: 0,
              w: Math.max(w, height),
              h: height,
              r: height / 2,
              color: ACCENT_STRONG,
            },
          ]
        : []),
    ],
  };
}

function ringSvg(fraction: number, size: number): string {
  const stroke = 10;
  const r = (size - stroke) / 2 - 1;
  const c = size / 2;
  const f = Math.max(0, Math.min(1, fraction));
  let arc = '';
  if (f >= 0.999) {
    arc = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${ACCENT_STRONG}" stroke-width="${stroke}"/>`;
  } else if (f > 0) {
    const a = f * Math.PI * 2;
    const x = c + r * Math.sin(a);
    const y = c - r * Math.cos(a);
    arc = `<path d="M ${c} ${c - r} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="${ACCENT_STRONG}" stroke-width="${stroke}" stroke-linecap="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${SURFACE_2}" stroke-width="${stroke}"/>${arc}</svg>`;
}

/** The decorative blue brush stroke of the web header. */
function brushSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="515" height="130" viewBox="-20 -30 640 260" preserveAspectRatio="none"><path d="M18 150 C 90 128, 160 140, 230 118 S 380 96, 450 70 S 540 40, 584 24" fill="none" stroke="${ACCENT}" stroke-opacity="0.28" stroke-width="74" stroke-linecap="round"/><path d="M40 176 C 140 160, 220 168, 320 146 S 480 112, 570 84" fill="none" stroke="${ACCENT}" stroke-opacity="0.16" stroke-width="30" stroke-linecap="round"/></svg>`;
}

function sceneSvg(scene: string): string {
  const c = SCENES[scene] ??
    FALLBACK_SCENE ?? { sky: '#e1eef0', ground: '#afc69e', accent: '#6d9673' };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="150" viewBox="0 0 640 300"><rect width="640" height="300" fill="${c.sky}"/><circle cx="535" cy="57" r="25" fill="#f6dca4"/><path d="M0 197 Q160 153 315 192 T640 176 V300 H0Z" fill="${c.ground}"/><circle cx="210" cy="150" r="46" fill="${c.accent}" fill-opacity="0.85"/><rect x="330" y="110" width="150" height="86" rx="8" fill="${c.accent}" fill-opacity="0.6"/></svg>`;
}

function placeholderSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="150" viewBox="0 0 640 300"><rect width="640" height="300" fill="${SURFACE_2}"/><circle cx="470" cy="90" r="30" fill="#ffffff"/><path d="M60 250 L230 120 L340 210 L420 160 L580 250 Z" fill="#c9c7bf"/></svg>`;
}

function rule(color = RULE, width = 0.6, w = CONTENT_WIDTH): ContentCanvas {
  return {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: w, y2: 0, lineWidth: width, lineColor: color }],
  };
}

function heading(text: string, opts: { pageBreak?: boolean; eyebrow?: string } = {}): Content {
  return {
    stack: [
      ...(opts.eyebrow
        ? [
            {
              text: clean(opts.eyebrow).toUpperCase(),
              font: MONO,
              fontSize: 7.5,
              bold: true,
              color: ACCENT_STRONG,
              characterSpacing: 0.8,
              margin: [0, 0, 0, 2] as [number, number, number, number],
            },
          ]
        : []),
      { text: clean(text), font: DISPLAY, fontSize: 21, color: INK },
      {
        canvas: [{ type: 'rect', x: 0, y: 3, w: 44, h: 4, r: 2, color: ACCENT }],
        width: 44,
        height: 8,
      },
    ],
    margin: [0, 0, 0, 8],
    ...(opts.pageBreak ? { pageBreak: 'before' as const } : {}),
  } as Content;
}

function subheading(text: string, right?: string): Content {
  return {
    columns: [
      { text: clean(text), font: DISPLAY, fontSize: 12, width: '*' },
      ...(right
        ? [
            {
              text: clean(right),
              font: MONO,
              fontSize: 8.5,
              bold: true,
              color: MUTED,
              width: 'auto' as const,
              margin: [0, 3, 0, 0] as [number, number, number, number],
            },
          ]
        : []),
    ],
    margin: [0, 10, 0, 4],
    unbreakable: true,
    headlineLevel: 1,
  } as Content;
}

const TABLE_LAYOUT = {
  hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
    i === 0 || i === node.table.body.length ? 0.8 : 0.4,
  vLineWidth: () => 0,
  hLineColor: (i: number) => (i === 0 ? INK : RULE),
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3.5,
  paddingBottom: () => 3.5,
};

const HEAD_FILL = (row: number) => (row === 0 ? SURFACE_2 : null);

function th(text: string): TableCell {
  return {
    text: text.toUpperCase(),
    font: MONO,
    fontSize: 6.8,
    bold: true,
    color: MUTED,
    characterSpacing: 0.5,
  };
}

function statusLabel(s: SkillSummary): string {
  return { completed: 'Submitted', 'in-progress': 'In progress', 'not-started': 'Not started' }[
    s.status
  ];
}

// ---------------------------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------------------------

function cover(model: ReportModel): Content[] {
  const { input } = model;
  const tiles: Content[] = model.skills.map((s) => ({
    width: '*',
    stack: [
      { svg: ringSvg(s.fraction, 86), width: 86, alignment: 'center' },
      {
        text: clean(s.headline),
        font: DISPLAY,
        fontSize: s.headline.length > 4 ? 14 : 18,
        alignment: 'center',
        margin: [0, -51, 0, 0],
      },
      {
        text: clean(SKILL_NAME(s)),
        font: DISPLAY,
        fontSize: 12,
        alignment: 'center',
        margin: [0, s.headline.length > 4 ? 36 : 33, 0, 0],
      },
      {
        text: clean(s.caption),
        fontSize: 7.5,
        color: MUTED,
        alignment: 'center',
        margin: [0, 1, 0, 0],
      },
      {
        text: s.marked ? `${statusLabel(s)} | practice score` : `${statusLabel(s)} | not scored`,
        font: MONO,
        fontSize: 6.5,
        color: MUTED,
        alignment: 'center',
        margin: [0, 2, 0, 0],
      },
    ],
  }));

  const meta: [string, string][] = [
    ['Format', model.formatName],
    ['Student', input.studentName.trim() || 'Not set (add your name in Settings)'],
    ['Date', formatDate(input.date) || formatDate(input.exportedAt)],
    ['Attempt', `${input.attemptNumber}${input.current ? ' (latest)' : ''}`],
    ['Report', model.options.mode === 'full' ? 'Full report' : 'Answer sheet'],
  ];

  const overall =
    model.totals.percent === null
      ? 'No marked section has been answered in this attempt.'
      : `Reading and Listening together: ${model.totals.correct} of ${model.totals.total} correct (${model.totals.percent}%) | ${practiceBand(model.totals.percent).label}`;

  return [
    {
      columns: [
        {
          text: 'LEARN ENGLISH  ·  B1',
          font: MONO,
          bold: true,
          fontSize: 10,
          color: ACCENT_STRONG,
          characterSpacing: 1,
        },
        {
          text: 'PRACTICE REPORT',
          font: MONO,
          fontSize: 8,
          color: MUTED,
          alignment: 'right',
          margin: [0, 2, 0, 0],
        },
      ],
    },
    {
      svg: brushSvg(),
      width: CONTENT_WIDTH,
      absolutePosition: { x: PAGE_MARGIN, y: 70 },
    } as Content,
    {
      text: clean(model.title),
      font: DISPLAY,
      fontSize: 36,
      lineHeight: 1.0,
      color: INK,
      margin: [0, 78, 0, 6],
    },
    { text: clean(input.exam.subtitle), fontSize: 12, color: MUTED, margin: [0, 0, 60, 0] },
    {
      margin: [0, 30, 0, 0],
      table: {
        widths: [70, '*'],
        body: meta.map(([k, v]) => [
          {
            text: k.toUpperCase(),
            font: MONO,
            fontSize: 7,
            bold: true,
            color: MUTED,
            characterSpacing: 0.6,
            margin: [0, 2, 0, 0],
          },
          { text: clean(v), fontSize: 11 },
        ]),
      },
      layout: {
        ...TABLE_LAYOUT,
        hLineColor: () => RULE,
        hLineWidth: (i: number, n: { table: { body: unknown[] } }) =>
          i === n.table.body.length ? 0 : 0.4,
        paddingLeft: () => 0,
      },
    },
    {
      text: 'SCORE BY SKILL',
      font: MONO,
      bold: true,
      fontSize: 8,
      color: ACCENT_STRONG,
      characterSpacing: 0.8,
      margin: [0, 34, 0, 12],
    },
    { columns: tiles, columnGap: 8 },
    { text: clean(overall), fontSize: 10.5, margin: [0, 26, 0, 0] },
    {
      margin: [0, 24, 0, 0],
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: 'Original practice materials — not an official exam paper. Scores are for Reading and Listening only and are not a Cambridge, EOI or CEFR result. Writing and Speaking are not marked: the checker notes, metrics and ratings in this report are guidance for your own practice.',
              fontSize: 8.5,
              color: MUTED,
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => RULE,
        vLineColor: () => RULE,
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
        fillColor: () => SURFACE,
      },
    },
  ];
}

function SKILL_NAME(s: SkillSummary): string {
  return s.label;
}

// ---------------------------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------------------------

function summary(model: ReportModel): Content[] {
  const out: Content[] = [heading('Summary', { pageBreak: true, eyebrow: 'Overview' })];

  const rows: TableCell[][] = [
    [th('Skill'), th('Status'), th('Result'), th('Time used'), th('Flagged')],
    ...model.skills.map((s): TableCell[] => [
      { text: s.label, font: DISPLAY, fontSize: 10.5 },
      { text: statusLabel(s), fontSize: 9 },
      {
        text: s.marked ? `${s.correct} / ${s.total} (${s.headline})` : `${s.headline} ${s.caption}`,
        font: MONO,
        fontSize: 8.5,
      },
      {
        text:
          s.seconds !== null
            ? `${formatDuration(s.seconds)} of ${s.limitMinutes} min`
            : `limit ${s.limitMinutes} min`,
        font: MONO,
        fontSize: 8.5,
        color: s.seconds !== null ? INK : MUTED,
      },
      {
        text: s.marked ? (model.input.current ? String(s.flagged) : 'not saved') : '–',
        font: MONO,
        fontSize: 8.5,
        color: MUTED,
      },
    ]),
  ];
  out.push({
    table: { headerRows: 1, widths: [70, 62, '*', 100, 48], body: rows },
    layout: { ...TABLE_LAYOUT, fillColor: HEAD_FILL },
  });
  if (!model.input.current) {
    out.push({
      text: 'Time used and flagged questions are only kept for the attempt in progress.',
      fontSize: 8,
      color: MUTED,
      margin: [0, 4, 0, 0],
    });
  }

  for (const report of model.reports) {
    const body: TableCell[][] = [
      [th('Part'), th('Correct'), th('%'), th('')],
      ...report.parts
        .filter((p) => p.score.total > 0)
        .map((p): TableCell[] => [
          { text: `Part ${p.number}: ${clean(p.title)}`, fontSize: 9 },
          { text: `${p.score.correct} / ${p.score.total}`, font: MONO, fontSize: 8.5 },
          { text: `${p.percent}%`, font: MONO, fontSize: 8.5, bold: true },
          { ...bar(p.percent / 100, 110), margin: [0, 2, 0, 0] },
        ]),
    ];
    if (body.length === 1) continue;
    out.push(
      subheading(
        `${report.skill[0]!.toUpperCase()}${report.skill.slice(1)} by part`,
        `${report.score.correct} / ${report.score.total}  ${report.percent}%`,
      ),
    );
    out.push({
      table: { headerRows: 1, widths: ['*', 54, 36, 118], body },
      layout: { ...TABLE_LAYOUT, fillColor: HEAD_FILL },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Reading and Listening detail
// ---------------------------------------------------------------------------------------------

function markOf(item: ReportItem): Mark {
  return item.correct ? 'correct' : item.answered ? 'wrong' : 'blank';
}

function objectiveSection(model: ReportModel, report: SectionReport): Content[] {
  const full = model.options.mode === 'full';
  const label = `${report.skill[0]!.toUpperCase()}${report.skill.slice(1)}`;
  const out: Content[] = [
    heading(full ? `${label}: questions and answers` : `${label}: answer sheet`, {
      pageBreak: full,
      eyebrow: `${report.score.correct} of ${report.score.total} correct | ${report.percent}%`,
    }),
  ];
  if (!full) out[0] = { ...(out[0] as object), margin: [0, 14, 0, 6] } as Content;
  const widths: (number | string)[] = full ? [18, '*', 96, 96, 56] : [18, '*', '*', 56];
  for (const part of report.parts) {
    if (part.items.length === 0) continue;
    const span = widths.length;
    const titleRow: TableCell[] = [
      {
        colSpan: span,
        columns: [
          {
            text: `Part ${part.number}: ${clean(part.title)}`,
            font: DISPLAY,
            fontSize: 10.5,
            width: '*',
          },
          {
            text: `${part.score.correct} / ${part.score.total}  ${part.percent}%`,
            font: MONO,
            bold: true,
            fontSize: 8.5,
            width: 'auto',
          },
        ],
      } as TableCell,
      ...Array.from({ length: span - 1 }, () => ({}) as TableCell),
    ];
    const head: TableCell[] = full
      ? [th('#'), th('Question'), th('Your answer'), th('Correct answer'), th('Mark')]
      : [th('#'), th('Your answer'), th('Correct answer'), th('Mark')];
    const rows = part.items.map((item): TableCell[] => {
      const flagged = model.flaggedIds.has(item.item.id);
      const yours: TableCell = {
        text: clean(item.answered ? item.given : '(blank)'),
        fontSize: 8.5,
        color: item.correct ? GOOD : item.answered ? BAD : MUTED,
        bold: !item.correct && item.answered ? false : undefined,
      };
      const key: TableCell = { text: clean(item.expected), fontSize: 8.5 };
      if (!full) {
        return [
          { text: String(item.n), font: MONO, fontSize: 8, color: MUTED },
          yours,
          key,
          markCell(markOf(item)) as TableCell,
        ];
      }
      const question: Content[] = [
        { text: clean(item.item.prompt), fontSize: 8.8 },
        ...(flagged
          ? [
              {
                text: 'FLAGGED FOR REVIEW',
                font: MONO,
                fontSize: 6.5,
                bold: true,
                color: WARN,
                margin: [0, 1, 0, 0] as [number, number, number, number],
              },
            ]
          : []),
        ...(item.item.explanation
          ? [
              {
                text: `Why: ${clean(item.item.explanation)}`,
                fontSize: 7.8,
                color: MUTED,
                margin: [0, 2, 0, 0] as [number, number, number, number],
              },
            ]
          : []),
      ];
      return [
        { text: String(item.n), font: MONO, fontSize: 8, color: MUTED },
        { stack: question },
        yours,
        key,
        markCell(markOf(item)) as TableCell,
      ];
    });
    out.push({
      margin: [0, 0, 0, 10],
      table: {
        headerRows: 2,
        keepWithHeaderRows: 1,
        dontBreakRows: true,
        widths,
        body: [titleRow, head, ...rows],
      },
      layout: {
        ...TABLE_LAYOUT,
        fillColor: (row: number) => (row === 0 ? SURFACE_2 : row === 1 ? SURFACE : null),
        hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
          i === 0 || i === node.table.body.length || i === 2 ? 0.8 : 0.4,
        hLineColor: (i: number) => (i <= 2 ? INK : RULE),
      },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

const LENGTH_TEXT: Record<string, string> = {
  empty: 'No text',
  short: 'Too short',
  good: 'Good length',
  long: 'Too long',
};

function ratingDots(value: number | null): ContentCanvas {
  const dots: ContentCanvas['canvas'] = [];
  for (let i = 0; i < 5; i++) {
    const filled = value !== null && i < value;
    dots.push({
      type: 'ellipse',
      x: 6 + i * 15,
      y: 6,
      r1: 5,
      r2: 5,
      lineWidth: 1,
      lineColor: filled ? ACCENT_STRONG : MUTED,
      ...(filled ? { color: ACCENT_STRONG } : {}),
    });
  }
  return { canvas: dots };
}

function rubricTable(w: WritingModel): Content {
  return {
    margin: [0, 4, 0, 0],
    unbreakable: true,
    stack: [
      {
        text: 'Your self-assessment (0 to 5)',
        font: DISPLAY,
        fontSize: 10.5,
        margin: [0, 6, 0, 3],
      },
      {
        table: {
          widths: [110, 80, 30, '*'],
          body: RUBRIC.map((c): TableCell[] => {
            const v = w.summary.rubric[c.id];
            return [
              { text: c.name, fontSize: 8.8 },
              ratingDots(v) as TableCell,
              { text: v === null ? '–' : `${v}/5`, font: MONO, fontSize: 8.5, bold: true },
              { text: c.question, fontSize: 7.8, color: MUTED },
            ];
          }),
        },
        layout: TABLE_LAYOUT,
      },
      {
        text:
          w.summary.rubricAverage === null
            ? 'Not rated. This is your own opinion, not an examiner mark.'
            : `Average ${w.summary.rubricAverage.toFixed(1)} of 5. This is your own opinion, not an examiner mark.`,
        fontSize: 7.8,
        color: MUTED,
        margin: [0, 3, 0, 0],
      },
    ],
  };
}

function writingPart(model: ReportModel, w: WritingModel): Content[] {
  const s = w.summary;
  const full = model.options.mode === 'full';
  const out: Content[] = [];
  out.push(subheading(s.title, `${s.words} words | ${LENGTH_TEXT[s.state] ?? ''}`));

  if (!full) {
    out.push({
      text: `Target ${clean(s.target)} words. Task: ${clean(s.task.title)}.`,
      fontSize: 8.8,
      color: MUTED,
    });
    out.push(rubricTable(w));
    return out;
  }

  // Task
  const task: Content[] = [
    { text: clean(s.task.title), font: DISPLAY, fontSize: 10.5 },
    { text: clean(s.task.prompt), fontSize: 9, margin: [0, 2, 0, 0] },
  ];
  if (s.task.sourceEmail) {
    const e = s.task.sourceEmail;
    task.push({
      margin: [8, 4, 0, 0],
      stack: [
        {
          text: `From: ${clean(e.from)}   Subject: ${clean(e.subject)}`,
          font: MONO,
          fontSize: 7.5,
          color: MUTED,
        },
        { text: clean(e.body), fontSize: 8.8, margin: [0, 2, 0, 0] },
      ],
    });
  }
  if (s.task.openingSentence) {
    task.push({
      text: `Start with: "${clean(s.task.openingSentence)}"`,
      fontSize: 8.8,
      margin: [0, 3, 0, 0],
    });
  }
  if (s.task.notes?.length) {
    task.push({ ul: s.task.notes.map(clean), fontSize: 8.8, margin: [8, 3, 0, 0] });
  }
  task.push({
    text: `Write ${clean(s.task.wordCount)}.`,
    font: MONO,
    fontSize: 7.8,
    color: MUTED,
    margin: [0, 3, 0, 0],
  });
  out.push({
    unbreakable: true,
    table: { widths: ['*'], body: [[{ stack: task }]] },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i: number) => (i === 0 ? 3 : 0),
      vLineColor: () => ACCENT,
      paddingLeft: () => 10,
      paddingTop: () => 5,
      paddingBottom: () => 5,
      fillColor: () => SURFACE,
    },
  });

  // Answer with line numbers
  out.push({
    text: `YOUR ANSWER | ${s.words} WORDS | TARGET ${clean(s.target).toUpperCase()}`,
    font: MONO,
    fontSize: 7.5,
    bold: true,
    color: ACCENT_STRONG,
    characterSpacing: 0.6,
    margin: [0, 10, 0, 3],
  });
  if (w.lines.length === 0) {
    out.push({ text: 'No text was written for this task.', color: MUTED, fontSize: 9 });
  } else {
    out.push({
      table: {
        widths: [20, '*'],
        dontBreakRows: true,
        body: w.lines.map((line): TableCell[] => [
          {
            text: String(line.n),
            font: MONO,
            fontSize: 7,
            color: MUTED,
            alignment: 'right',
            margin: [0, 1, 0, 0],
          },
          {
            text: line.text
              ? lineSegments(line, s.text, w.issues).map((seg) => ({
                  text: clean(seg.text),
                  ...(seg.marked
                    ? {
                        decoration: 'underline' as const,
                        decorationStyle: 'dotted' as const,
                        decorationColor: BAD,
                      }
                    : {}),
                }))
              : ' ',
            font: MONO,
            fontSize: 8.5,
            lineHeight: 1.15,
          },
        ]),
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: (i: number) => (i === 1 ? 0.6 : 0),
        vLineColor: () => RULE,
        paddingTop: () => 1.2,
        paddingBottom: () => 1.2,
        paddingLeft: (i: number) => (i === 0 ? 0 : 7),
        paddingRight: () => 2,
      },
    });
    out.push({
      text: 'Dotted underline = a place the checker flagged (see the notes below).',
      fontSize: 7.3,
      color: MUTED,
      margin: [0, 3, 0, 0],
    });
  }

  // Checker notes
  if (s.words > 0) {
    if (w.issues.length === 0) {
      out.push({
        text: 'Checker notes',
        font: DISPLAY,
        fontSize: 10.5,
        margin: [0, 10, 0, 3],
      });
      out.push({
        text: 'No grammar or vocabulary notes from the rule-based checker. Spelling is not included in this report.',
        fontSize: 8.8,
      });
    } else {
      const shown = w.issues.slice(0, 30);
      out.push({
        margin: [0, 10, 0, 0],
        table: {
          headerRows: 2,
          keepWithHeaderRows: 1,
          dontBreakRows: true,
          widths: [24, 78, '*', 90],
          body: [
            [
              {
                colSpan: 4,
                text: 'Checker notes',
                font: DISPLAY,
                fontSize: 10.5,
                margin: [-4, 0, 0, 0],
              },
              {},
              {},
              {},
            ],
            [th('Line'), th('Found'), th('Note'), th('Try')],
            ...shown.map((i): TableCell[] => [
              { text: String(lineOf(w.lines, i.start)), font: MONO, fontSize: 8 },
              { text: clean(i.original), font: MONO, fontSize: 7.8 },
              {
                stack: [
                  {
                    text: `${clean(i.category)}${i.severity === 'note' ? ' (hint)' : ''}`,
                    font: MONO,
                    fontSize: 6.5,
                    bold: true,
                    color: MUTED,
                  },
                  { text: clean(i.message), fontSize: 8.3 },
                ],
              },
              {
                text: clean(i.suggestions.slice(0, 2).join(' / ')) || '–',
                font: MONO,
                fontSize: 7.8,
              },
            ]),
          ],
        },
        layout: {
          ...TABLE_LAYOUT,
          fillColor: (row: number) => (row === 1 ? SURFACE_2 : null),
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 ? 0 : i === 1 || i === node.table.body.length ? 0.8 : 0.4,
        },
      });
      if (w.issues.length > shown.length) {
        out.push({
          text: `...and ${w.issues.length - shown.length} more.`,
          fontSize: 8,
          color: MUTED,
          margin: [0, 2, 0, 0],
        });
      }
      out.push({
        text: 'Spelling is not included in this report. Notes marked "hint" may be correct in context.',
        fontSize: 7.3,
        color: MUTED,
        margin: [0, 3, 0, 0],
      });
    }

    // Task checklist
    if (w.checklist.length) {
      const checklistHeading: Content = {
        text: 'Task checklist',
        font: DISPLAY,
        fontSize: 10.5,
        margin: [0, 10, 0, 3],
      };
      const checklistTable: Content = {
        table: {
          widths: [14, '*'],
          body: w.checklist.map((c): TableCell[] => [
            {
              ...markIcon(c.status === 'done' ? 'correct' : 'blank'),
              margin: [0, 1, 0, 0],
            } as TableCell,
            {
              text: [
                { text: clean(c.label), fontSize: 8.6 },
                ...(c.detail
                  ? [{ text: `  ${clean(c.detail)}`, fontSize: 7.8, color: MUTED }]
                  : []),
                {
                  text: c.status === 'done' ? '  [done]' : '  [to do]',
                  font: MONO,
                  fontSize: 6.8,
                  color: MUTED,
                },
              ],
            },
          ]),
        },
        layout: { ...TABLE_LAYOUT, hLineWidth: () => 0.3 },
      };
      out.push({ unbreakable: true, stack: [checklistHeading, checklistTable] });
    }
  }

  out.push(rubricTable(w));
  return out;
}

function writingSection(model: ReportModel): Content[] {
  if (model.writing.length === 0) return [];
  const full = model.options.mode === 'full';
  const skill = model.skills.find((s) => s.skill === 'writing');
  const out: Content[] = [
    heading(full ? 'Writing' : 'Writing: word counts and self-assessment', {
      pageBreak: full,
      eyebrow: skill ? `${skill.headline} tasks written | not marked` : undefined,
    }),
  ];
  if (!full) out[0] = { ...(out[0] as object), margin: [0, 14, 0, 6] } as Content;
  model.writing.forEach((w) => out.push(...writingPart(model, w)));
  return out;
}

// ---------------------------------------------------------------------------------------------
// Speaking
// ---------------------------------------------------------------------------------------------

function metricsLine(p: SpeakingPromptModel): string[] {
  const m = p.metrics;
  if (!m) return [];
  const bits = [`${m.words} words`];
  if (m.durationSeconds !== null) bits.push(`${formatDuration(m.durationSeconds)} recorded`);
  if (m.wordsPerMinute !== null) bits.push(`${m.wordsPerMinute} words per minute`);
  if (m.averageSentenceLength !== null) bits.push(`${m.averageSentenceLength} words per sentence`);
  if (m.lexicalVariety !== null) bits.push(`word variety ${Math.round(m.lexicalVariety * 100)}%`);
  const lines = [bits.join('  |  ')];
  if (m.connectors.length) {
    lines.push(
      `Linking words: ${m.connectors
        .slice(0, 8)
        .map((c) => `${c.text} x${c.count}`)
        .join(', ')}`,
    );
  }
  if (m.fillers.length) {
    lines.push(
      `Fillers: ${m.fillers
        .slice(0, 6)
        .map((c) => `${c.text} x${c.count}`)
        .join(', ')}`,
    );
  }
  return lines;
}

function thumbnail(p: SpeakingPromptModel): Content | null {
  const v = p.visual;
  if (!v) return null;
  const image: Content = p.thumbnail
    ? { image: p.thumbnail, width: 150, margin: [0, 0, 0, 0] }
    : { svg: v.illustration ? sceneSvg(v.illustration) : placeholderSvg(), width: 150 };
  const credit = v.image
    ? `Photo: ${v.image.credit.author} | ${v.image.credit.license} | ${v.image.credit.sourceUrl}`
    : v.illustration
      ? 'Original practice illustration'
      : 'Picture not available in this report';
  return {
    stack: [
      image,
      {
        text: clean(credit),
        fontSize: 6.3,
        color: MUTED,
        margin: [0, 2, 0, 0],
        ...(v.image ? { link: v.image.credit.sourceUrl } : {}),
      },
    ],
  } as Content;
}

function speakingPrompt(model: ReportModel, p: SpeakingPromptModel): Content {
  const full = model.options.mode === 'full';
  const meta: string[] = [];
  if (p.seconds !== null) meta.push(`Duration ${formatDuration(p.seconds)}`);
  if (p.metrics) meta.push(`${p.metrics.words} words`);
  meta.push(p.recorded ? 'Recording saved on this device (included in the ZIP)' : 'No recording');

  if (!full) {
    return {
      columns: [
        { text: clean(p.label), fontSize: 8.8, width: '*' },
        {
          text:
            p.transcript || p.recorded ? meta.slice(0, 2).join(' | ') || 'Recorded' : 'No answer',
          font: MONO,
          fontSize: 7.8,
          color: MUTED,
          width: 'auto',
        },
      ],
      columnGap: 8,
      margin: [0, 0, 0, 3],
    };
  }
  const thumb = thumbnail(p);
  const text: Content[] = [
    { text: clean(p.label), font: DISPLAY, fontSize: 10.5 },
    {
      text: clean(meta.join('  |  ')),
      font: MONO,
      fontSize: 7.3,
      color: MUTED,
      margin: [0, 2, 0, 4],
    },
    p.transcript
      ? { text: clean(p.transcript), fontSize: 9.2, lineHeight: 1.25 }
      : { text: 'No transcript saved.', fontSize: 9, color: MUTED },
    ...metricsLine(p).map((line, i) => ({
      text: clean(line),
      font: MONO,
      fontSize: 7.2,
      color: MUTED,
      margin: [0, i === 0 ? 5 : 1, 0, 0] as [number, number, number, number],
    })),
  ];
  return {
    unbreakable: true,
    margin: [0, 0, 0, 8],
    table: {
      widths: ['*'],
      body: [
        [
          thumb
            ? { columns: [thumb, { stack: text, margin: [10, 0, 0, 0] }], columnGap: 0 }
            : { stack: text },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.8,
      hLineColor: () => RULE,
      vLineColor: () => RULE,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
  } as Content;
}

function speakingPartBlock(model: ReportModel, sp: SpeakingPartModel): Content[] {
  const out: Content[] = [];
  const head: Content[] = [subheading(`Part ${sp.part.number}: ${sp.part.title}`)];
  const ctx = [...sp.context];
  if (sp.topic) ctx.push(`Your topic: ${sp.topic}`);
  if (model.options.mode === 'full' && ctx.length) {
    head.push({
      text: ctx.map(clean).join('\n'),
      fontSize: 8.8,
      color: MUTED,
      margin: [0, 0, 0, 5],
    });
  }
  // The heading travels with the first card so it never ends a page alone.
  const [first, ...rest] = sp.prompts.map((p) => speakingPrompt(model, p));
  out.push({ stack: first ? [...head, first] : head, unbreakable: true } as Content, ...rest);
  return out;
}

function speakingSection(model: ReportModel): Content[] {
  if (model.speaking.length === 0) return [];
  const full = model.options.mode === 'full';
  const skill = model.skills.find((s) => s.skill === 'speaking');
  const out: Content[] = [
    heading(full ? 'Speaking' : 'Speaking: tasks answered', {
      pageBreak: full,
      eyebrow: skill ? `${skill.headline} tasks answered | not marked` : undefined,
    }),
  ];
  if (!full) out[0] = { ...(out[0] as object), margin: [0, 14, 0, 6] } as Content;
  if (full) {
    out.push({
      text: 'Transcripts come from your browser’s speech recognition or from text you typed, so recognition errors are possible. Metrics are simple counts for practice; they are not a score.',
      fontSize: 8,
      color: MUTED,
      margin: [0, 0, 0, 4],
    });
  }
  for (const sp of model.speaking) out.push(...speakingPartBlock(model, sp));
  return out;
}

// ---------------------------------------------------------------------------------------------
// Annex
// ---------------------------------------------------------------------------------------------

function annex(model: ReportModel): Content[] {
  if (model.sources.length === 0) return [];
  const out: Content[] = [
    heading('Annex: texts and scripts', {
      pageBreak: true,
      eyebrow: 'Reading texts and listening scripts',
    }),
  ];
  for (const section of model.sources) {
    out.push({
      text: section.skill === 'reading' ? 'Reading' : 'Listening',
      font: DISPLAY,
      fontSize: 13,
      margin: [0, 6, 0, 2],
    });
    let last = '';
    for (const b of section.blocks) {
      if (b.partTitle !== last) {
        out.push({
          text: clean(b.partTitle),
          font: MONO,
          bold: true,
          fontSize: 7.8,
          color: ACCENT_STRONG,
          margin: [0, 8, 0, 2],
        });
        last = b.partTitle;
      }
      out.push({
        margin: [0, 0, 0, 5],
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  ...(b.heading
                    ? [
                        {
                          text: clean(b.heading),
                          bold: true,
                          fontSize: 8.3,
                          margin: [0, 0, 0, 1] as [number, number, number, number],
                        },
                      ]
                    : []),
                  { text: clean(b.text), fontSize: 8.6, lineHeight: 1.22 },
                ],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: (i: number) => (i === 0 ? 2 : 0),
          vLineColor: () => RULE,
          paddingLeft: () => 8,
          paddingTop: () => 1,
          paddingBottom: () => 1,
        },
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------------------------

/** Builds the pdfmake document. Pure: fonts are registered by the caller. */
export function buildDocument(model: ReportModel): TDocumentDefinitions {
  const full = model.options.mode === 'full';
  const content: Content[] = [...cover(model), ...summary(model)];
  for (const r of model.reports) content.push(...objectiveSection(model, r));
  content.push(...writingSection(model), ...speakingSection(model));
  if (full) content.push(...annex(model));

  const title = clean(model.title);
  return {
    pageSize: 'A4',
    pageMargins: [PAGE_MARGIN, 52, PAGE_MARGIN, 50],
    info: {
      title: `${title} - ${full ? 'full report' : 'answer sheet'}`,
      author: clean(model.input.studentName) || 'Learn English',
      subject: 'B1 English practice report',
      creator: 'Learn English',
    },
    defaultStyle: { font: 'Bricolage', fontSize: 9.5, color: INK, lineHeight: 1.18 },
    header: (page: number): Content | null =>
      page === 1
        ? null
        : {
            margin: [PAGE_MARGIN, 24, PAGE_MARGIN, 0],
            stack: [
              {
                columns: [
                  {
                    text: 'LEARN ENGLISH  ·  B1',
                    font: MONO,
                    bold: true,
                    fontSize: 7.5,
                    color: ACCENT_STRONG,
                    characterSpacing: 0.8,
                  },
                  { text: title, font: DISPLAY, fontSize: 8.5, alignment: 'right', color: MUTED },
                ],
              },
              rule(INK, 0.6),
            ],
          },
    footer: (page: number, pages: number): Content => ({
      margin: [PAGE_MARGIN, 14, PAGE_MARGIN, 0],
      stack: [
        rule(RULE, 0.5),
        {
          margin: [0, 4, 0, 0],
          columns: [
            {
              text: 'Original practice materials — not an official exam paper',
              fontSize: 7,
              color: MUTED,
              width: '*',
            },
            {
              text: `Page ${page} of ${pages}`,
              font: MONO,
              fontSize: 7.5,
              bold: true,
              alignment: 'right',
              width: 80,
            },
          ],
        },
      ],
    }),
    // A heading is never the last thing on a page.
    pageBreakBefore: (current, queries) =>
      current.headlineLevel === 1 && queries.getFollowingNodesOnPage().length === 0,
    content,
  };
}
