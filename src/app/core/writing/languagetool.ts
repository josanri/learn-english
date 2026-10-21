import type { Issue, IssueGroup } from './types';

/** Public LanguageTool endpoint. Used only when the learner turns the option on in Settings. */
export const LANGUAGETOOL_URL = 'https://api.languagetool.org/v2/check';
/** The free service refuses longer texts. */
export const LANGUAGETOOL_MAX_CHARS = 20000;

interface LtMatch {
  message?: string;
  offset?: number;
  length?: number;
  replacements?: { value?: string }[];
  rule?: { id?: string; issueType?: string; category?: { id?: string; name?: string } };
}

function groupOf(match: LtMatch): IssueGroup {
  const category = match.rule?.category?.id ?? '';
  const type = match.rule?.issueType ?? '';
  if (category === 'TYPOS' || type === 'misspelling') return 'spelling';
  if (['GRAMMAR', 'PUNCTUATION', 'CASING', 'TYPOGRAPHY', 'COMPOUNDING'].includes(category)) {
    return 'grammar';
  }
  return type === 'grammar' ? 'grammar' : 'vocabulary';
}

/** Turns a LanguageTool response into issues. Unknown or malformed entries are skipped. */
export function parseLanguageTool(json: unknown, text: string): Issue[] {
  const matches = (json as { matches?: LtMatch[] } | null)?.matches;
  if (!Array.isArray(matches)) return [];
  const issues: Issue[] = [];
  for (const match of matches) {
    const start = match.offset;
    const length = match.length;
    if (typeof start !== 'number' || typeof length !== 'number' || length <= 0) continue;
    const end = start + length;
    if (start < 0 || end > text.length) continue;
    const group = groupOf(match);
    const rule = `lt:${match.rule?.id ?? 'unknown'}`;
    issues.push({
      id: `${rule}:${start}:${end}`,
      ruleId: rule,
      group,
      severity: group === 'vocabulary' ? 'note' : 'error',
      source: 'languagetool',
      category: match.rule?.category?.name ?? 'LanguageTool',
      start,
      end,
      original: text.slice(start, end),
      message: match.message ?? 'LanguageTool suggests a change here.',
      suggestions: (match.replacements ?? [])
        .map((r) => r.value)
        .filter((v): v is string => typeof v === 'string')
        .slice(0, 4),
    });
  }
  return issues;
}

/**
 * Asks LanguageTool to check the text. The text leaves the device, so callers must have checked
 * the `languageTool` setting first. Rejects on network errors, rate limits and aborts.
 */
export async function checkWithLanguageTool(
  text: string,
  lang: 'en-GB' | 'en-US',
  signal?: AbortSignal,
  fetchFn: typeof fetch = fetch,
): Promise<Issue[]> {
  const body = new URLSearchParams({
    text: text.slice(0, LANGUAGETOOL_MAX_CHARS),
    language: lang,
    level: 'default',
  });
  const response = await fetchFn(LANGUAGETOOL_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal,
  });
  if (!response.ok) throw new Error(`LanguageTool answered ${response.status}`);
  return parseLanguageTool(await response.json(), text);
}
