import { runRules } from './checker-core';
import { applyIssue, checkRules, compileRules } from './rule-engine';
import rulesFile from './rules.json';
import type { RuleFile } from './types';

const file = rulesFile as RuleFile;

/** A correct text in the style of a B1 learner: no rule may complain about it. */
const CLEAN_TEXT = `Dear Alex,

Thanks for your email! I'm really excited that you are coming next month. I would like to visit the old castle near my town, because it has a beautiful view and a lot of history. It depends on the weather, but I think we could go on Saturday.

You should bring a warm jacket and comfortable shoes. Last week, I checked the forecast and it said that it will be cold. I have lived here for five years, so I know the best places to eat. Do you like Italian food? Please tell me what you want to do.

My brother is 15 years old and he plays football every weekend. He doesn't like cooking, but she likes it. Most of my friends live nearby. Is it important to book a table? It is raining now, so we stayed at home. There are many people in the park, and there is a small lake. I'm looking forward to seeing you!

Best wishes,
Maria

I was just about to leave when the phone rang. It was my best friend, and she told me that the party had changed. We decided to meet at a cafe instead, where we talked for hours. In the end, we had a great time. The next week we went to the cinema, and I had a good laugh. In my opinion, this was the best weekend of the year. I have never seen such a big crowd. We arrived at the station at six and waited for the bus. She is married to a doctor. He asked me to explain the rules to him. Finally, I went home and slept well. On the other hand, my sister prefers staying at home at the weekend. It's a nice day, e.g. sunny. Mr. Smith lives in Spain. He has an umbrella and a useful book. A university is a place to learn.`;

describe('writing rules (rules.json)', () => {
  it('has at least 60 rules with unique ids and an explanation each', () => {
    expect(file.rules.length).toBeGreaterThanOrEqual(60);
    const ids = file.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const rule of file.rules) {
      expect(rule.message.trim().length, rule.id).toBeGreaterThan(10);
      expect(['grammar', 'vocabulary']).toContain(rule.group);
      expect(['error', 'note']).toContain(rule.severity);
    }
  });

  it('covers the mistakes the task lists', () => {
    const ids = new Set(file.rules.map((r) => r.id));
    for (const id of [
      'informations',
      'advices',
      'furnitures',
      'homeworks',
      'a-people',
      'people-is',
      'am-agree',
      'depend-of',
      'explain-me',
      'married-with',
      'discuss-about',
      'arrive-to',
      'make-photo',
      'make-party',
      'say-me',
      'since-period',
      'the-last-time',
      'have-years',
      'he-dont',
      'more-better',
      'the-most-of',
      'actually',
      'assist-to',
      'sensible',
      'carpet',
      'constipated',
      'is-important',
      'is-raining',
      'the-general',
      'adjective-order',
      'for-to',
      'how-is-called',
      'space-before-punct',
      'lowercase-i',
      'greeting-comma',
      'closing-comma',
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  describe.each(file.rules.map((r) => [r.id, r] as const))('%s', (_id, rule) => {
    const only = compileRules([rule]);

    it('flags its bad example', () => {
      const issues = checkRules(rule.bad, only);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].ruleId).toBe(rule.id);
      expect(issues[0].start).toBeLessThan(issues[0].end);
    });

    it('does not flag its good example', () => {
      expect(checkRules(rule.good, only)).toEqual([]);
    });

    if (rule.fixed !== undefined) {
      it('turns the bad example into the fixed one with the first suggestion', () => {
        const issue = checkRules(rule.bad, only)[0];
        expect(issue.suggestions.length).toBeGreaterThan(0);
        expect(applyIssue(rule.bad, issue, issue.suggestions[0])).toBe(rule.fixed);
      });
    }
  });

  it('finds nothing in a correct text (no false positives)', () => {
    const compiled = compileRules(file.rules);
    expect(runRules(CLEAN_TEXT, compiled).map((i) => `${i.ruleId}: ${i.original}`)).toEqual([]);
  });

  it('keeps capital letters and curly apostrophes working', () => {
    const compiled = compileRules(file.rules);
    const issues = runRules('She don’t know. Informations are useful.', compiled);
    expect(issues.map((i) => i.ruleId)).toEqual(['he-dont', 'informations']);
    expect(issues[0].suggestions[0]).toBe("She doesn't");
  });

  it('treats "actually" as a gentle note, not an error', () => {
    const issue = runRules('Actually, I like it.', compileRules(file.rules))[0];
    expect(issue).toMatchObject({ ruleId: 'actually', severity: 'note', suggestions: [] });
  });

  it('does not flag fixed expressions that look like mistakes', () => {
    const compiled = compileRules(file.rules);
    const text =
      'We make the most of our time. One of the people is late. They are married with two children. ' +
      'In the last week I read three books. That is a lot of fun. In the last month it rained.';
    expect(runRules(text, compiled).map((i) => i.ruleId)).toEqual([]);
  });
});
