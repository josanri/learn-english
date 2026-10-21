import type { Issue, RuleDef } from './types';

/** A rule with its regular expression built once. */
export interface CompiledRule {
  def: RuleDef;
  regex: RegExp;
}

export function compileRules(rules: readonly RuleDef[]): CompiledRule[] {
  return rules.map((def) => ({
    def,
    regex: new RegExp(def.pattern, [...new Set(`${def.flags}g`)].join('')),
  }));
}

/** Replaces `$0`..`$9` by capture groups and `$m1`..`$m9` by the mapped capture group. */
export function expandTemplate(
  template: string,
  match: RegExpMatchArray,
  map: Record<string, string> | undefined,
): string {
  return template.replace(/\$(m)?(\d)/g, (_all, mapped: string | undefined, n: string) => {
    const value = match[Number(n)] ?? '';
    if (!mapped) return value;
    return map?.[value.toLowerCase()] ?? value;
  });
}

function startsUpper(text: string): boolean {
  const first = text.charAt(0);
  return first !== first.toLowerCase() && first === first.toUpperCase();
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "a" before a vowel letter becomes "an" and the other way round (after words were reordered). */
function fixArticles(text: string): string {
  return text.replace(/\b([Aa])n? ([A-Za-z])/g, (_all, article: string, next: string) => {
    const needsAn = /[aeiouAEIOU]/.test(next);
    return `${article}${needsAn ? 'n' : ''} ${next}`;
  });
}

function suggestionsFor(rule: RuleDef, match: RegExpMatchArray): string[] {
  if (rule.replacement === undefined) return [];
  const templates = Array.isArray(rule.replacement) ? rule.replacement : [rule.replacement];
  const original = match[0];
  const out: string[] = [];
  for (const template of templates) {
    let text = expandTemplate(template, match, rule.map);
    if (rule.fixArticle) text = fixArticles(text);
    if (startsUpper(original) && !startsUpper(text)) text = capitalise(text);
    if (text !== original && !out.includes(text)) out.push(text);
  }
  return out;
}

/** Runs the rules over the text. Offsets refer to the text as given (quotes are never lengthened). */
export function checkRules(text: string, rules: readonly CompiledRule[]): Issue[] {
  const issues: Issue[] = [];
  for (const { def, regex } of rules) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const original = match[0];
      if (original.length === 0 || match.index === undefined) continue;
      const start = match.index;
      const end = start + original.length;
      issues.push({
        id: `${def.id}:${start}:${end}`,
        ruleId: def.id,
        group: def.group,
        severity: def.severity,
        source: 'rules',
        category: def.category,
        start,
        end,
        original,
        message: def.message,
        suggestions: suggestionsFor(def, match),
      });
    }
  }
  return issues;
}

/** The text after replacing the issue by one of its suggestions (or any other string). */
export function applyIssue(
  text: string,
  issue: Pick<Issue, 'start' | 'end'>,
  replacement: string,
): string {
  return text.slice(0, issue.start) + replacement + text.slice(issue.end);
}

const PRIORITY: Record<Issue['source'], number> = { rules: 0, spelling: 1, languagetool: 2 };

/**
 * Removes overlapping issues so highlights never nest: errors win over notes, then rules over
 * spelling over LanguageTool, then the issue that starts first. Result is sorted by position.
 */
export function mergeIssues(issues: readonly Issue[]): Issue[] {
  const ranked = [...issues].sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1) ||
      PRIORITY[a.source] - PRIORITY[b.source] ||
      a.start - b.start ||
      b.end - b.start - (a.end - a.start),
  );
  const kept: Issue[] = [];
  for (const issue of ranked) {
    if (!kept.some((k) => issue.start < k.end && k.start < issue.end)) kept.push(issue);
  }
  return kept.sort((a, b) => a.start - b.start);
}

/**
 * Moves issues after the text changed from `before` to `after`, so highlights stay on the right
 * words while the learner types and a new check is still running. Issues touched by the edit are dropped.
 */
export function remapIssues(issues: readonly Issue[], before: string, after: string): Issue[] {
  if (before === after) return [...issues];
  let prefix = 0;
  const shortest = Math.min(before.length, after.length);
  while (prefix < shortest && before.charCodeAt(prefix) === after.charCodeAt(prefix)) prefix++;
  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)
  ) {
    suffix++;
  }
  const oldEnd = before.length - suffix;
  const delta = after.length - before.length;
  const out: Issue[] = [];
  for (const issue of issues) {
    if (issue.end <= prefix) out.push(issue);
    else if (issue.start >= oldEnd) {
      const start = issue.start + delta;
      const end = issue.end + delta;
      out.push({ ...issue, start, end, id: `${issue.ruleId}:${start}:${end}` });
    }
  }
  return out;
}
