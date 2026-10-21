/// <reference lib="webworker" />
import nspell from 'nspell';
import { CheckerCore } from './checker-core';
import rules from './rules.json';
import type { CheckRequest, RuleFile } from './types';

/**
 * Web Worker of the writing checker. It holds the rules and, after the first request, the Hunspell
 * dictionary (`assets/dictionaries/<lang>.aff|dic`, fetched on demand and never part of the main
 * bundle). The page sends `CheckRequest` messages and receives `CheckResponse` messages.
 */
async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.text();
}

const core = new CheckerCore(rules as RuleFile, async (lang, base) => {
  const [aff, dic] = await Promise.all([
    fetchText(`${base}${lang}.aff`),
    fetchText(`${base}${lang}.dic`),
  ]);
  return nspell(aff, dic);
});

addEventListener('message', ({ data }: MessageEvent<CheckRequest>) => {
  if (data.type === 'check') void core.handle(data, (response) => postMessage(response));
});
