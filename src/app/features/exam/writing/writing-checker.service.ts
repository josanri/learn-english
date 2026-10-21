import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { CheckerCore } from '../../../core/writing/checker-core';
import { checkWithLanguageTool } from '../../../core/writing/languagetool';
import { mergeIssues, remapIssues } from '../../../core/writing/rule-engine';
import type {
  CheckRequest,
  CheckResponse,
  ChecklistItem,
  Issue,
  RuleFile,
  SpellingState,
  TaskSpec,
} from '../../../core/writing/types';

export interface CheckInput {
  text: string;
  lang: 'en-GB' | 'en-US';
  exceptions: string[];
  task: TaskSpec | null;
  /** Ask the public LanguageTool service too (only when the learner allowed it in Settings). */
  languageTool: boolean;
}

const RULES_DELAY_MS = 350;
const LANGUAGETOOL_DELAY_MS = 1500;

/**
 * Runs the writing checker for one writing screen. The work happens in a Web Worker
 * (`core/writing/checker.worker.ts`), created on the first check; the dictionary is fetched by the
 * worker, so none of this is in the main bundle. Without Worker support the rules still run on the
 * main thread and spelling is reported as unavailable.
 *
 * Results are positions in the text they were computed for. `textChanged()` shifts them while the
 * learner types, so highlights stay on the right words until the next result arrives.
 */
@Injectable()
export class WritingCheckerService {
  private readonly document = inject(DOCUMENT);

  private worker: Worker | null = null;
  private fallback: Promise<CheckerCore> | null = null;
  private lastId = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ltTimer: ReturnType<typeof setTimeout> | undefined;
  private ltAbort: AbortController | undefined;
  private lastText = '';

  private readonly local = signal<Issue[]>([]);
  private readonly remote = signal<Issue[]>([]);
  /** Every issue, overlaps removed, sorted by position. */
  readonly issues = computed(() => mergeIssues([...this.local(), ...this.remote()]));
  readonly checklist = signal<ChecklistItem[]>([]);
  readonly spelling = signal<SpellingState>('idle');
  /** `error`: LanguageTool could not be reached (the rest of the checker keeps working). */
  readonly languageToolState = signal<'off' | 'idle' | 'checking' | 'error'>('off');
  /** True from the moment the text changes until the matching result arrives. */
  readonly busy = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Moves the existing results after an edit (call it on every change of the text). */
  textChanged(before: string, after: string): void {
    this.local.update((issues) => remapIssues(issues, before, after));
    this.remote.update((issues) => remapIssues(issues, before, after));
    this.lastText = after;
  }

  /** Schedules a check; `immediate` skips the typing pause (after "Apply", on open). */
  request(input: CheckInput, immediate = false): void {
    clearTimeout(this.timer);
    this.busy.set(true);
    this.timer = setTimeout(() => this.run(input), immediate ? 0 : RULES_DELAY_MS);
    this.scheduleLanguageTool(input, immediate);
  }

  /** Forgets the results (the text was emptied or the task changed). */
  reset(): void {
    this.local.set([]);
    this.remote.set([]);
    this.checklist.set([]);
  }

  stop(): void {
    clearTimeout(this.timer);
    clearTimeout(this.ltTimer);
    this.ltAbort?.abort();
    this.worker?.terminate();
    this.worker = null;
  }

  private scheduleLanguageTool(input: CheckInput, immediate: boolean): void {
    clearTimeout(this.ltTimer);
    this.ltAbort?.abort();
    if (!input.languageTool) {
      this.remote.set([]);
      this.languageToolState.set('off');
      return;
    }
    if (input.text.trim().length < 3) {
      this.remote.set([]);
      this.languageToolState.set('idle');
      return;
    }
    this.languageToolState.set('checking');
    this.ltTimer = setTimeout(
      () => {
        const abort = new AbortController();
        this.ltAbort = abort;
        checkWithLanguageTool(input.text, input.lang, abort.signal)
          .then((issues) => {
            if (input.text !== this.lastText) return; // the text moved on; a newer request follows
            this.remote.set(issues);
            this.languageToolState.set('idle');
          })
          .catch((error: unknown) => {
            if ((error as { name?: string }).name === 'AbortError') return;
            this.remote.set([]);
            this.languageToolState.set('error');
          });
      },
      immediate ? 300 : LANGUAGETOOL_DELAY_MS,
    );
  }

  private run(input: CheckInput): void {
    const request: CheckRequest = {
      type: 'check',
      id: ++this.lastId,
      text: input.text,
      lang: input.lang,
      exceptions: input.exceptions,
      task: input.task,
      dictionaryBase: new URL('assets/dictionaries/', this.document.baseURI).href,
    };
    this.lastText = input.text;
    const worker = this.ensureWorker();
    if (worker) worker.postMessage(request);
    else void this.runOnMainThread(request);
  }

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (typeof Worker === 'undefined') return null;
    try {
      const worker = new Worker(new URL('../../../core/writing/checker.worker', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = ({ data }: MessageEvent<CheckResponse>) => this.receive(data);
      worker.onerror = () => {
        // The worker could not start: carry on without it.
        this.worker?.terminate();
        this.worker = null;
        this.spelling.set('unavailable');
        this.busy.set(false);
      };
      this.worker = worker;
      return worker;
    } catch {
      return null;
    }
  }

  private async runOnMainThread(request: CheckRequest): Promise<void> {
    this.fallback ??= import('../../../core/writing/rules.json').then(
      (rules) =>
        new CheckerCore((rules.default ?? rules) as RuleFile, () =>
          Promise.reject(new Error('No Web Worker: dictionaries are not loaded')),
        ),
    );
    const core = await this.fallback;
    await core.handle(request, (response) => this.receive(response));
  }

  private receive(response: CheckResponse): void {
    if (response.id !== this.lastId) return; // an older request
    this.checklist.set(response.checklist);
    if (response.phase === 'full' || this.spelling() !== 'ready') {
      this.spelling.set(response.spelling);
    }
    if (response.phase === 'rules') {
      // Keep the spelling underlines of the previous result until the dictionary answers.
      const spelling = this.local().filter((i) => i.source === 'spelling');
      this.local.set(mergeIssues([...response.issues, ...spelling]));
    } else {
      this.local.set(response.issues);
      this.busy.set(false);
    }
  }
}
