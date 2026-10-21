import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Part, Section, WritingSection } from '../../models/exam';
import type { AttemptData } from '../../models/storage';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Icon,
  ProgressBar,
  ProgressRing,
  ToastService,
} from '../../shared/ui';
import { MARKED_SKILLS, buildSectionReport, type SectionReport } from './engine/report';
import { percent, practiceBand } from './engine/scoring';
import { partPrompts } from './parts/part-registry';
import { isResponded } from './parts/speaking-prompts';
import { RUBRIC, writingSummary, type WritingPartSummary } from './parts/writing-prompts';
import { ExamSessionStore } from './session/exam-session.store';

interface AttemptView {
  id: string;
  label: string;
  current: boolean;
  data: AttemptData;
  date: string;
  reports: SectionReport[];
  /** Speaking has no score: how many tasks got a recording or transcript. */
  speaking: { done: number; total: number; submitted: boolean } | null;
  /** Writing has no score: the texts, word counts, checker counts and the learner's own rubric. */
  writing: { parts: WritingPartSummary[]; submitted: boolean } | null;
  correct: number;
  total: number;
  percent: number | null;
}

/**
 * `/results`: score per skill with a ring, breakdown per part, every question with your answer, the
 * correct one and the explanation, the history of attempts and Retry (which keeps earlier attempts).
 */
@Component({
  selector: 'app-results-page',
  imports: [
    DatePipe,
    RouterLink,
    Badge,
    Button,
    Card,
    Dialog,
    EmptyState,
    Icon,
    ProgressBar,
    ProgressRing,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <h2 class="title">Results</h2>
      @if (view(); as v) {
        <app-card [raised]="true">
          <div class="overall">
            @if (v.percent !== null) {
              <app-progress-ring [value]="v.percent / 100" [size]="112" label="Overall score" />
              <div>
                <p class="big">
                  <span class="mono">{{ v.correct }} / {{ v.total }}</span> correct
                </p>
                <p>
                  <app-badge tone="accent">{{ band(v.percent).label }}</app-badge>
                  {{ band(v.percent).hint }}
                </p>
              </div>
            } @else {
              <p>No section has been submitted in this attempt yet.</p>
            }
          </div>
          <p class="note muted">
            This is a practice score for Reading and Listening only. It is not an official result.
          </p>
          @if (isCambridge()) {
            <details class="note">
              <summary>Why is there no Cambridge English Scale score?</summary>
              <p class="muted">
                Cambridge turns raw marks into scale scores with conversion tables that change for
                every real test version and are not published. These papers are original practice
                material with their own number of questions, so any scale number here would be a
                guess. Your percentage and the breakdown below are more honest.
              </p>
            </details>
          }
        </app-card>

        @for (report of v.reports; track report.skill) {
          <section class="skill" [attr.aria-labelledby]="'skill-' + report.skill">
            <div class="skill-head">
              <app-progress-ring
                [value]="report.percent / 100"
                [size]="72"
                [label]="report.skill + ' score'"
              />
              <div>
                <h3 [id]="'skill-' + report.skill">{{ report.skill }}</h3>
                <p class="mono">{{ report.score.correct }} / {{ report.score.total }} correct</p>
              </div>
            </div>
            <ul class="parts">
              @for (part of report.parts; track part.partId) {
                @if (part.score.total > 0) {
                  <li>
                    <details>
                      <summary>
                        <span class="part-name">Part {{ part.number }}: {{ part.title }}</span>
                        <span class="mono">{{ part.score.correct }}/{{ part.score.total }}</span>
                      </summary>
                      <app-progress-bar
                        [value]="part.percent / 100"
                        [label]="'Part ' + part.number + ' score'"
                      />
                      <ol class="answers">
                        @for (item of part.items; track item.item.id) {
                          <li class="answer" [attr.data-ok]="item.correct">
                            <p class="q-text">
                              <span class="num mono">{{ item.n }}</span> {{ item.item.prompt }}
                            </p>
                            <p>
                              <strong class="verdict">{{
                                item.correct
                                  ? 'Correct'
                                  : item.answered
                                    ? 'Incorrect'
                                    : 'Not answered'
                              }}</strong>
                              &middot; Your answer: {{ item.given }}
                            </p>
                            @if (!item.correct) {
                              <p>Correct answer: {{ item.expected }}</p>
                            }
                            @if (item.item.explanation) {
                              <p class="muted">{{ item.item.explanation }}</p>
                            }
                          </li>
                        }
                      </ol>
                    </details>
                  </li>
                }
              }
            </ul>
          </section>
        }

        @for (skill of pending(v); track skill) {
          <app-card>
            <p class="pending">
              <strong class="cap">{{ skill }}</strong> has not been submitted in this attempt.
              @if (v.current) {
                <a [routerLink]="['..', skill]">Go to {{ skill }}</a>
              }
            </p>
          </app-card>
        }

        @if (v.speaking; as sp) {
          <app-card class="speaking">
            <h3>Speaking</h3>
            <p>
              <span class="mono">{{ sp.done }} / {{ sp.total }}</span> tasks with a recording or
              transcript.
              @if (sp.submitted) {
                <app-badge tone="success">Submitted</app-badge>
              } @else {
                <app-badge>Not submitted</app-badge>
              }
            </p>
            <p class="muted">
              Speaking has no score here: the app cannot judge pronunciation or grammar. Use the
              practice feedback next to each answer as a guide.
            </p>
            @if (v.current) {
              <a appButton size="sm" [routerLink]="['..', 'speaking']">{{
                sp.submitted ? 'Review speaking' : 'Go to speaking'
              }}</a>
            }
          </app-card>
        }

        @if (v.writing; as wr) {
          <app-card class="writing">
            <h3>Writing</h3>
            <p>
              @if (wr.submitted) {
                <app-badge tone="success">Submitted</app-badge>
              } @else {
                <app-badge>Not submitted</app-badge>
              }
            </p>
            @for (part of wr.parts; track part.partId) {
              <section class="wpart" [attr.aria-label]="part.title">
                <h4>{{ part.title }}: {{ part.task.title }}</h4>
                <p>
                  <span class="mono">{{ part.words }} words</span>
                  <span class="muted"> (aim for {{ part.target }})</span>
                  <app-badge [tone]="part.state === 'good' ? 'success' : 'neutral'">{{
                    lengthLabel(part.state)
                  }}</app-badge>
                </p>
                @if (part.check; as check) {
                  <p class="muted">
                    Last check: <span class="mono">{{ check.spelling }}</span> spelling,
                    <span class="mono">{{ check.grammar }}</span> grammar,
                    <span class="mono">{{ check.vocabulary }}</span> vocabulary hints;
                    <span class="mono">{{ check.checklistDone }}/{{ check.checklistTotal }}</span>
                    checklist items done.
                  </p>
                }
                <dl class="rubric">
                  @for (c of criteria; track c.id) {
                    <div>
                      <dt>{{ c.name }}</dt>
                      <dd class="mono">
                        {{ part.rubric[c.id] === null ? 'not rated' : part.rubric[c.id] + '/5' }}
                      </dd>
                    </div>
                  }
                </dl>
                @if (part.text) {
                  <details>
                    <summary>Show my text</summary>
                    <p class="yourtext">{{ part.text }}</p>
                  </details>
                }
              </section>
            }
            <p class="muted">
              Writing has no score here. The suggestions are automatic and can be wrong, and the
              ratings are your own: neither is an official mark.
            </p>
            @if (v.current) {
              <a appButton size="sm" [routerLink]="['..', 'writing']">{{
                wr.submitted ? 'Review writing' : 'Go to writing'
              }}</a>
            }
          </app-card>
        }

        <section class="history" aria-labelledby="history-title">
          <h3 id="history-title">Attempts</h3>
          <ul class="attempts">
            @for (a of views(); track a.id) {
              <li [class.selected]="a.id === v.id">
                <span>
                  <strong>{{ a.label }}</strong>
                  <span class="muted"> &middot; {{ a.date | date: 'mediumDate' }}</span>
                </span>
                <span class="mono">{{
                  a.percent === null ? 'Not submitted' : a.percent + '%'
                }}</span>
                <button
                  appButton
                  size="sm"
                  type="button"
                  [attr.aria-current]="a.id === v.id ? 'true' : null"
                  (click)="selectedId.set(a.id)"
                >
                  {{ a.id === v.id ? 'Viewing' : 'View'
                  }}<span class="visually-hidden"> {{ a.label }}</span>
                </button>
              </li>
            }
          </ul>
        </section>
      } @else {
        <app-empty-state
          heading="No results yet"
          description="Submit a Reading or Listening section and your marks will appear here."
          icon="info"
        >
          <a appButton variant="primary" routerLink="../reading">Start with Reading</a>
        </app-empty-state>
      }

      @if (canRetry()) {
        <div class="retry">
          <button appButton type="button" (click)="confirmRetry.set(true)">
            <app-icon name="refresh" [size]="18" />
            Retry this exam
          </button>
        </div>
      }
      <app-dialog heading="Start a new attempt?" [(open)]="confirmRetry">
        <p>
          Your current answers and scores are kept in the list of attempts. The exam will start
          again with empty answers.
        </p>
        <ng-container actions>
          <button appButton type="button" (click)="confirmRetry.set(false)">Cancel</button>
          <button appButton variant="primary" type="button" (click)="retry()">Start again</button>
        </ng-container>
      </app-dialog>
    </div>
  `,
  styles: `
    .title {
      font-size: var(--step-3);
    }
    .overall {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-5);
    }
    .big {
      margin: 0 0 var(--space-2);
      font-size: var(--step-2);
      font-weight: 800;
    }
    .note {
      margin: var(--space-4) 0 0;
      font-size: var(--step--1);
    }
    .skill {
      margin-top: var(--space-6);
    }
    .skill-head {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-3);
    }
    .skill-head h3 {
      margin: 0;
      text-transform: capitalize;
    }
    .skill-head p {
      margin: 0;
    }
    .parts,
    .attempts,
    .answers {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .parts > li {
      margin-bottom: var(--space-2);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      min-height: var(--target);
      padding: var(--space-2) var(--space-4);
      font-weight: 700;
      cursor: pointer;
    }
    details > :not(summary) {
      margin-inline: var(--space-4);
    }
    .answers {
      padding-block: var(--space-3);
    }
    .answer {
      margin-bottom: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-left: 4px solid var(--border-muted);
      border-radius: var(--radius-sm);
      background: var(--bg);
    }
    .answer p {
      margin: 0 0 var(--space-1);
    }
    .answer[data-ok='true'] {
      border-left-color: var(--success);
    }
    .answer[data-ok='false'] {
      border-left-color: var(--danger);
    }
    .answer[data-ok='true'] .verdict {
      color: var(--success);
    }
    .answer[data-ok='false'] .verdict {
      color: var(--danger);
    }
    .q-text {
      font-weight: 600;
    }
    .num {
      margin-right: var(--space-2);
      color: var(--text-muted);
    }
    .pending {
      margin: 0;
    }
    .speaking,
    .writing {
      margin-top: var(--space-5);
    }
    .speaking h3,
    .writing h3 {
      margin-top: 0;
    }
    .wpart {
      margin-bottom: var(--space-4);
      padding-top: var(--space-3);
      border-top: var(--bw) solid var(--border-muted);
    }
    .wpart h4 {
      margin: 0 0 var(--space-2);
      letter-spacing: 0;
    }
    .rubric {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: var(--space-2);
      margin: var(--space-3) 0;
    }
    .rubric dt {
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .rubric dd {
      margin: 0;
      font-weight: 700;
    }
    .yourtext {
      margin: var(--space-2) 0 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .cap {
      text-transform: capitalize;
    }
    .history {
      margin-top: var(--space-7);
    }
    .attempts li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
    }
    .attempts li.selected {
      border-color: var(--border);
      background: var(--surface);
    }
    .retry {
      margin-top: var(--space-6);
    }
  `,
})
export class ResultsPage {
  private readonly store = inject(ExamSessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly selectedId = signal<string | null>(null);
  protected readonly confirmRetry = signal(false);
  protected readonly criteria = RUBRIC;

  /** Every attempt with content: earlier ones first, the current one last. */
  protected readonly views = computed<AttemptView[]>(() => {
    const exam = this.store.exam();
    const progress = this.store.progress();
    if (!exam || !progress) return [];
    const marked = exam.sections.filter((s) => MARKED_SKILLS.includes(s.skill));
    const hasContent = (d: AttemptData) =>
      Object.keys(d.answers).length > 0 || Object.keys(d.results).length > 0;
    const build = (
      id: string,
      label: string,
      current: boolean,
      data: AttemptData,
      date: string,
    ): AttemptView => {
      const reports = marked
        .filter((s: Section) => data.sectionStatus[s.skill] === 'completed')
        .map((s) => buildSectionReport(s, data.answers));
      const correct = reports.reduce((n, r) => n + r.score.correct, 0);
      const total = reports.reduce((n, r) => n + r.score.total, 0);
      const speakingSection = exam.sections.find((s) => s.skill === 'speaking');
      const prompts = speakingSection
        ? (speakingSection.parts as Part[]).flatMap((part) => partPrompts(part))
        : [];
      const writingSection = exam.sections.find((s): s is WritingSection => s.skill === 'writing');
      return {
        id,
        label,
        current,
        data,
        date,
        reports,
        writing: writingSection
          ? {
              parts: writingSummary(writingSection, data.answers),
              submitted: data.sectionStatus['writing'] === 'completed',
            }
          : null,
        speaking: speakingSection
          ? {
              done: prompts.filter((p) => isResponded(data.answers, p.id)).length,
              total: prompts.length,
              submitted: data.sectionStatus['speaking'] === 'completed',
            }
          : null,
        correct,
        total,
        percent: total > 0 ? percent({ correct, total }) : null,
      };
    };
    const views = progress.attempts.map((a, i) =>
      build(a.id, `Attempt ${i + 1}`, false, a, a.finishedAt),
    );
    if (hasContent(progress)) {
      const n = views.length + 1;
      views.push(
        build(
          'current',
          `Attempt ${n}${n > 1 ? ' (current)' : ''}`,
          true,
          progress,
          progress.updatedAt,
        ),
      );
    }
    return views;
  });

  protected readonly view = computed(() => {
    const views = this.views();
    return views.find((v) => v.id === this.selectedId()) ?? views[views.length - 1];
  });

  protected readonly isCambridge = computed(() =>
    (this.store.exam()?.board ?? '').toString().startsWith('cambridge'),
  );
  protected readonly canRetry = computed(() => this.views().some((v) => v.current));

  protected lengthLabel(state: string): string {
    return (
      { empty: 'No text', short: 'Too short', good: 'Good length', long: 'Too long' }[state] ?? ''
    );
  }

  protected band(value: number) {
    return practiceBand(value);
  }

  /** Auto-marked sections of the exam not submitted in the viewed attempt. */
  protected pending(view: AttemptView): string[] {
    const exam = this.store.exam();
    if (!exam) return [];
    return exam.sections
      .filter(
        (s) => MARKED_SKILLS.includes(s.skill) && view.data.sectionStatus[s.skill] !== 'completed',
      )
      .map((s) => s.skill);
  }

  protected retry(): void {
    this.confirmRetry.set(false);
    this.store.retry();
    this.selectedId.set(null);
    this.toast.show('New attempt started. Your earlier attempt is saved in the list.', 'success');
    void this.router.navigate(['../reading'], { relativeTo: this.route });
  }
}
