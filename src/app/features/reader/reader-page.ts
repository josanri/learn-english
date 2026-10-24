import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalStorageService } from '../../core/storage.service';
import { PracticeCatalogueService } from '../../data/practice-catalogue.service';
import type { StoryLevel, StorySummary } from '../../models/practice';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  Icon,
  SegmentedControl,
  type SegmentOption,
} from '../../shared/ui';
import { STORY_LEVELS, filterStories, readingMinutes, storyOfTheDay } from './reader-engine';

const LEVEL_OPTIONS: SegmentOption[] = [
  { value: 'all', label: 'All levels' },
  ...STORY_LEVELS.map((level) => ({ value: level, label: level })),
];

/** `/reader`: original short stories graded around B1, with a suggestion for today. */
@Component({
  selector: 'app-reader-page',
  imports: [RouterLink, Badge, Button, Chip, EmptyState, Icon, SegmentedControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">Reading &middot; B1</p>
      <h1>Graded reader</h1>
      <p class="lede">
        Short original stories written for B1 learners. Tap an underlined word to see what it means,
        listen to the story, then answer a few questions.
      </p>

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading the stories&hellip;</p>
      } @else if (resource.error()) {
        <app-empty-state
          heading="The stories could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="resource.reload()">Try again</button>
        </app-empty-state>
      } @else {
        <ul class="stats" aria-label="Your progress">
          <li>
            <app-chip [prompt]="false"
              >{{ finishedCount() }} of {{ stories().length }} read</app-chip
            >
          </li>
        </ul>

        @if (today(); as story) {
          <section class="today" aria-labelledby="today-title">
            <p class="label">Story of the day</p>
            <h2 id="today-title">{{ story.title }}</h2>
            <p>{{ story.summary }}</p>
            <p class="facts">
              <span>{{ story.level }}</span>
              <span aria-hidden="true">&middot;</span>
              <span>{{ minutes(story) }} min</span>
              <span aria-hidden="true">&middot;</span>
              <span>{{ story.topic }}</span>
            </p>
            <a appButton variant="primary" size="lg" [routerLink]="['/reader', story.id]">
              Read it now
              <app-icon name="arrow" [size]="22" />
            </a>
          </section>
        }

        <section aria-labelledby="all-title" class="all fold-side">
          <h2 id="all-title" class="section-title">All stories</h2>
          <div class="filters">
            <app-segmented-control label="Level" [options]="levels" [(value)]="level" />
            <div class="field">
              <label for="story-topic">Topic</label>
              <select
                id="story-topic"
                [value]="topic()"
                (change)="topic.set($any($event.target).value)"
              >
                <option value="all">All topics</option>
                @for (t of topicNames(); track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>
            <label class="switch-row" for="unread-only">
              <input
                id="unread-only"
                type="checkbox"
                [checked]="unreadOnly()"
                (change)="unreadOnly.set($any($event.target).checked)"
              />
              Only stories I have not read
            </label>
          </div>

          <p class="muted" role="status">
            {{ shown().length }} {{ shown().length === 1 ? 'story' : 'stories' }}
          </p>
          <ul class="list">
            @for (story of shown(); track story.id) {
              <li>
                <a [routerLink]="['/reader', story.id]">
                  <span class="title">{{ story.title }}</span>
                  <span class="summary">{{ story.summary }}</span>
                  <span class="facts">
                    <span>{{ story.level }}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{{ minutes(story) }} min</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{{ story.topic }}</span>
                  </span>
                  @if (result(story.id); as r) {
                    <app-badge tone="success"
                      >Read &middot; {{ r.correct }}/{{ r.total }}</app-badge
                    >
                  }
                </a>
              </li>
            } @empty {
              <li class="none">No stories match. Change the filters.</li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: `
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: var(--space-4) 0 0;
      padding: 0;
      list-style: none;
    }
    .today {
      display: grid;
      justify-items: start;
      gap: var(--space-3);
      max-width: 44rem;
      margin-top: var(--space-6);
      padding: var(--space-5);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--paper-blue);
      color: var(--paper-ink);
      box-shadow: 6px 6px 0 var(--shadow-solid);
    }
    .today h2 {
      margin: 0;
      font-size: var(--step-3);
      line-height: 1.05;
      letter-spacing: -0.03em;
    }
    .today p {
      margin: 0;
    }
    .label {
      font-family: var(--font-mono);
      font-size: var(--step--1);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      font-family: var(--font-mono);
      font-size: var(--step--1);
    }
    .all {
      margin-top: var(--space-8);
    }
    .filters {
      display: grid;
      gap: var(--space-4);
      margin-block: var(--space-4);
    }
    .filters .field {
      margin-bottom: 0;
      max-width: 22rem;
    }
    .switch-row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: var(--target);
      font-weight: 600;
      cursor: pointer;
    }
    .switch-row input {
      width: 1.4rem;
      height: 1.4rem;
      accent-color: var(--accent-strong);
    }
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
      gap: var(--space-4);
      margin: var(--space-4) 0 0;
      padding: 0;
      list-style: none;
    }
    .list a {
      display: grid;
      align-content: start;
      justify-items: start;
      gap: var(--space-2);
      height: 100%;
      padding: var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      text-decoration: none;
    }
    .list a:hover {
      background: var(--surface-2);
    }
    .title {
      font-size: var(--step-1);
      font-weight: 800;
    }
    .summary {
      color: var(--text-muted);
    }
    .list .facts {
      color: var(--text-muted);
    }
    .none {
      color: var(--text-muted);
    }
  `,
})
export class ReaderPage {
  protected readonly resource = inject(PracticeCatalogueService).storyIndex();
  private readonly store = inject(LocalStorageService);

  protected readonly levels = LEVEL_OPTIONS;
  protected readonly level = signal('all');
  protected readonly topic = signal('all');
  protected readonly unreadOnly = signal(false);

  protected readonly stories = computed<readonly StorySummary[]>(() =>
    this.resource.hasValue() ? this.resource.value().stories : [],
  );
  private readonly finished = computed(() => new Set(Object.keys(this.store.practice().stories)));
  protected readonly finishedCount = computed(
    () => this.stories().filter((s) => this.finished().has(s.id)).length,
  );
  protected readonly topicNames = computed(() =>
    [...new Set(this.stories().map((s) => s.topic))].sort(),
  );
  protected readonly today = computed(() =>
    storyOfTheDay(this.stories(), this.finished(), new Date()),
  );
  protected readonly shown = computed(() =>
    filterStories(
      this.stories(),
      {
        level: this.level() as StoryLevel | 'all',
        topic: this.topic(),
        unreadOnly: this.unreadOnly(),
      },
      this.finished(),
    ),
  );

  protected minutes(story: StorySummary): number {
    return readingMinutes(story.words);
  }

  protected result(id: string) {
    return this.store.practice().stories[id];
  }
}
