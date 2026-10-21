import type { TFontDictionary } from 'pdfmake/interfaces';
import { buildDocument } from './pdf-document';
import { buildReportModel, type ReportInput, type ReportOptions } from './report-model';

/**
 * Static fonts for the PDF (the web app uses the variable versions, which pdfmake cannot embed).
 * They live in `assets/fonts/pdf/` and are fetched only when a report is generated.
 */
const FONT_FILES = {
  Bricolage: {
    normal: 'bricolage-grotesque-latin-400-normal.woff',
    bold: 'bricolage-grotesque-latin-700-normal.woff',
  },
  BricolageHeavy: { normal: 'bricolage-grotesque-latin-800-normal.woff' },
  Mono: {
    normal: 'jetbrains-mono-latin-400-normal.woff',
    bold: 'jetbrains-mono-latin-700-normal.woff',
  },
} as const;

export function pdfFonts(base: string): TFontDictionary {
  const url = (file: string) => new URL(`assets/fonts/pdf/${file}`, base).href;
  const family = (f: { normal: string; bold?: string }) => ({
    normal: url(f.normal),
    bold: url(f.bold ?? f.normal),
    italics: url(f.normal),
    bolditalics: url(f.bold ?? f.normal),
  });
  return {
    Bricolage: family(FONT_FILES.Bricolage),
    BricolageHeavy: family(FONT_FILES.BricolageHeavy),
    Mono: family(FONT_FILES.Mono),
  };
}

/** Builds the report model (running the writing rules on the answers) and the PDF. */
export async function renderPdf(
  input: Omit<ReportInput, 'issuesFor'>,
  options: ReportOptions,
  base: string,
): Promise<{ blob: Blob; model: ReturnType<typeof buildReportModel> }> {
  const [pdfMakeModule, rulesModule, checker, ruleEngine] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('../../../core/writing/rules.json'),
    import('../../../core/writing/checker-core'),
    import('../../../core/writing/rule-engine'),
  ]);
  const compiled = ruleEngine.compileRules(rulesModule.default.rules as never);
  const model = buildReportModel(
    { ...input, issuesFor: (text) => (text.trim() ? checker.runRules(text, compiled) : []) },
    options,
  );
  // The build is UMD: depending on interop the API is on the namespace or on `default`.
  const pdfMake =
    typeof pdfMakeModule.createPdf === 'function'
      ? pdfMakeModule
      : (pdfMakeModule as unknown as { default: typeof pdfMakeModule }).default;
  pdfMake.setFonts(pdfFonts(base));
  const blob = await pdfMake.createPdf(buildDocument(model)).getBlob();
  return { blob, model };
}
