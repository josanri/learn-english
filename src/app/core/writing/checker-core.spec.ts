import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import nspell from 'nspell';
import { CheckerCore, type DictionaryLoader } from './checker-core';
import rulesFile from './rules.json';
import { MAX_SUGGESTION_LOOKUPS, checkSpelling } from './spelling';
import type { CheckRequest, CheckResponse, RuleFile, TaskSpec } from './types';

const read = (name: string) =>
  readFileSync(resolve(process.cwd(), 'src/assets/dictionaries', name), 'utf8');

const loadFromDisk: DictionaryLoader = async (lang) =>
  nspell(read(`${lang}.aff`), read(`${lang}.dic`));

const speller = nspell(read('en-GB.aff'), read('en-GB.dic'));
const spellerUs = nspell(read('en-US.aff'), read('en-US.dic'));

describe('checkSpelling', () => {
  const check = (text: string, exceptions: string[] = []) =>
    checkSpelling(text, speller, new Set(exceptions));

  it('finds misspelt words with suggestions and exact positions', () => {
    const text = 'I will recieve the letter tomorow.';
    const issues = check(text);
    expect(issues.map((i) => i.original)).toEqual(['recieve', 'tomorow']);
    expect(text.slice(issues[0].start, issues[0].end)).toBe('recieve');
    expect(issues[0].suggestions).toContain('receive');
    expect(issues[1].suggestions).toContain('tomorrow');
  });

  it('accepts correct words, contractions and curly apostrophes', () => {
    expect(check("I don’t think it's difficult, isn't it? We're happy.")).toEqual([]);
  });

  it('keeps the capital letter of the suggestion', () => {
    const [issue] = check('Recieve this.');
    expect(issue.suggestions[0]).toBe('Receive');
  });

  it('uses the right dictionary for British and American spelling', () => {
    const text = 'The colour of my favourite theatre.';
    expect(check(text)).toEqual([]);
    expect(checkSpelling(text, spellerUs, new Set()).map((i) => i.original)).toEqual([
      'colour',
      'favourite',
      'theatre',
    ]);
  });

  it('does not report names, acronyms, links, numbers or exceptions', () => {
    const text =
      'Hello Alvaro and Marisol from the UK. See www.exmple.com or me@exmple.org. Call 555. Zorblax is nice.';
    expect(check(text, ['zorblax']).map((i) => i.original)).toEqual([]);
  });

  it('reports an unknown word at the start of a sentence', () => {
    expect(check('Zorblax is nice.').map((i) => i.original)).toEqual(['Zorblax']);
  });

  it('limits the number of suggestion lookups', () => {
    const text = Array.from(
      { length: MAX_SUGGESTION_LOOKUPS + 10 },
      (_, i) => `qzx${'a'.repeat(i + 1)}b`,
    ).join(' ');
    const issues = check(text);
    expect(issues.length).toBe(MAX_SUGGESTION_LOOKUPS + 10);
    expect(issues.at(-1)?.suggestions).toEqual([]);
  });
});

describe('CheckerCore (the Web Worker logic)', () => {
  const task: TaskSpec = {
    kind: 'email',
    title: 'Reply',
    wordCount: 'about 100 words',
    contentPoints: [{ text: 'Say a place.', keywords: ['castle'] }],
  };
  const request = (text: string, extra: Partial<CheckRequest> = {}): CheckRequest => ({
    type: 'check',
    id: 1,
    text,
    lang: 'en-GB',
    exceptions: [],
    task,
    dictionaryBase: 'http://localhost/assets/dictionaries/',
    ...extra,
  });
  const run = async (core: CheckerCore, req: CheckRequest) => {
    const out: CheckResponse[] = [];
    await core.handle(req, (r) => out.push(r));
    return out;
  };

  it('answers with the rules first and adds spelling once the dictionary is ready', async () => {
    const core = new CheckerCore(rulesFile as RuleFile, loadFromDisk);
    const [rules, full, ...rest] = await run(core, request('Dear Alex, I am agree. I recieve it.'));
    expect(rest).toEqual([]);
    expect(rules).toMatchObject({ type: 'result', id: 1, phase: 'rules', spelling: 'loading' });
    expect(rules.issues.map((i) => i.ruleId)).toEqual(['am-agree']);
    expect(full).toMatchObject({ phase: 'full', spelling: 'ready' });
    expect(full.issues.map((i) => i.ruleId)).toEqual(['am-agree', 'spelling']);
    expect(full.checklist.find((c) => c.id === 'point-0')?.status).toBe('todo');
  });

  it('loads each dictionary only once', async () => {
    let loads = 0;
    const core = new CheckerCore(rulesFile as RuleFile, (lang, base) => {
      loads++;
      return loadFromDisk(lang, base);
    });
    await run(core, request('One.'));
    await run(core, request('Two.', { id: 2 }));
    await run(core, request('Three.', { id: 3, lang: 'en-US' }));
    expect(loads).toBe(2);
  });

  it('reports spelling as unavailable when the dictionary cannot be loaded, and tries again later', async () => {
    let fail = true;
    const core = new CheckerCore(rulesFile as RuleFile, (lang, base) =>
      fail ? Promise.reject(new Error('offline')) : loadFromDisk(lang, base),
    );
    const first = await run(core, request('I am agree.'));
    expect(first.at(-1)).toMatchObject({ phase: 'full', spelling: 'unavailable' });
    expect(first.at(-1)?.issues.map((i) => i.ruleId)).toEqual(['am-agree']);
    fail = false;
    const second = await run(core, request('I am agree.', { id: 2 }));
    expect(second.at(-1)).toMatchObject({ spelling: 'ready' });
  });

  it('works without a task', async () => {
    const core = new CheckerCore(rulesFile as RuleFile, loadFromDisk);
    const out = await run(core, request('Hello.', { task: null }));
    expect(out.at(-1)?.checklist).toEqual([]);
  });
});
