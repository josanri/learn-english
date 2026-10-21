import { checkCapitals } from './capitals';
import { checkRules, compileRules, mergeIssues, type CompiledRule } from './rule-engine';
import { checkSpelling, type Speller } from './spelling';
import { analyzeTask } from './task-check';
import { straightenQuotes } from './text';
import type { CheckRequest, CheckResponse, Issue, RuleFile } from './types';

/** Where the checker gets its dictionary from (a `fetch` in the worker, a file in tests). */
export type DictionaryLoader = (lang: CheckRequest['lang'], base: string) => Promise<Speller>;

/** Issues from the rules (no dictionary needed). Exposed for tests and the PDF report. */
export function runRules(text: string, compiled: CompiledRule[]): Issue[] {
  const straight = straightenQuotes(text);
  return mergeIssues([...checkRules(straight, compiled), ...checkCapitals(straight)]);
}

/**
 * The checker without any browser API: used by the Web Worker and directly by tests. Rules answer
 * immediately; spelling follows once the dictionary for the language has been loaded (once per language).
 */
export class CheckerCore {
  private readonly compiled: CompiledRule[];
  private readonly dictionaries = new Map<string, Promise<Speller>>();

  constructor(
    rules: RuleFile,
    private readonly loadDictionary: DictionaryLoader,
  ) {
    this.compiled = compileRules(rules.rules);
  }

  async handle(request: CheckRequest, post: (response: CheckResponse) => void): Promise<void> {
    const ruleIssues = runRules(request.text, this.compiled);
    const checklist = analyzeTask(request.text, request.task);
    post({
      type: 'result',
      id: request.id,
      phase: 'rules',
      issues: ruleIssues,
      checklist,
      spelling: 'loading',
    });

    let dictionary = this.dictionaries.get(request.lang);
    if (!dictionary) {
      dictionary = this.loadDictionary(request.lang, request.dictionaryBase);
      this.dictionaries.set(request.lang, dictionary);
    }
    let speller: Speller;
    try {
      speller = await dictionary;
    } catch {
      this.dictionaries.delete(request.lang);
      post({
        type: 'result',
        id: request.id,
        phase: 'full',
        issues: ruleIssues,
        checklist,
        spelling: 'unavailable',
      });
      return;
    }
    const exceptions = new Set(request.exceptions.map((w) => w.toLowerCase()));
    post({
      type: 'result',
      id: request.id,
      phase: 'full',
      issues: mergeIssues([...ruleIssues, ...checkSpelling(request.text, speller, exceptions)]),
      checklist,
      spelling: 'ready',
    });
  }
}
