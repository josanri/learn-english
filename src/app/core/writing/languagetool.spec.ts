import { LANGUAGETOOL_URL, checkWithLanguageTool, parseLanguageTool } from './languagetool';

const text = 'I has a apple. Teh end.';
const response = {
  matches: [
    {
      message: 'The verb form does not agree.',
      offset: 2,
      length: 3,
      replacements: [{ value: 'have' }],
      rule: {
        id: 'HAVE_PART_AGREEMENT',
        issueType: 'grammar',
        category: { id: 'GRAMMAR', name: 'Grammar' },
      },
    },
    {
      message: 'Possible spelling mistake.',
      offset: 15,
      length: 3,
      replacements: [{ value: 'The' }, { value: 'Ten' }],
      rule: {
        id: 'MORFOLOGIK',
        issueType: 'misspelling',
        category: { id: 'TYPOS', name: 'Possible Typo' },
      },
    },
    { message: 'Broken', offset: 999, length: 3 },
    { message: 'No length', offset: 1 },
  ],
};

describe('parseLanguageTool', () => {
  it('maps matches to issues and skips malformed ones', () => {
    const issues = parseLanguageTool(response, text);
    expect(issues.map((i) => [i.group, i.original, i.suggestions])).toEqual([
      ['grammar', 'has', ['have']],
      ['spelling', 'Teh', ['The', 'Ten']],
    ]);
    expect(issues[0]).toMatchObject({
      source: 'languagetool',
      severity: 'error',
      ruleId: 'lt:HAVE_PART_AGREEMENT',
    });
  });

  it('returns nothing for unexpected data', () => {
    expect(parseLanguageTool(null, text)).toEqual([]);
    expect(parseLanguageTool({ matches: 'no' }, text)).toEqual([]);
  });
});

describe('checkWithLanguageTool', () => {
  it('posts the text as a form to the public endpoint', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return { ok: true, json: async () => response } as Response;
    }) as unknown as typeof fetch;
    const issues = await checkWithLanguageTool(text, 'en-GB', undefined, fake);
    expect(issues.length).toBe(2);
    expect(calls[0].url).toBe(LANGUAGETOOL_URL);
    expect(calls[0].init.method).toBe('POST');
    expect(String(calls[0].init.body)).toContain('language=en-GB');
    expect(String(calls[0].init.body)).toContain('text=I+has');
  });

  it('rejects when the service answers with an error', async () => {
    const fake = (async () => ({ ok: false, status: 429 }) as Response) as unknown as typeof fetch;
    await expect(checkWithLanguageTool(text, 'en-US', undefined, fake)).rejects.toThrow('429');
  });
});
