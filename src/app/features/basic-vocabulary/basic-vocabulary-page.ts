import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalStorageService } from '../../core/storage.service';
import { PracticeCatalogueService } from '../../data/practice-catalogue.service';
import type { BasicTopic } from '../../models/practice';
import { Button, EmptyState, Icon, type IconName, ProgressBar } from '../../shared/ui';
import { topicProgress, type TopicProgress } from './basic-engine';

interface TopicRow {
  topic: BasicTopic;
  icon: IconName;
  progress: TopicProgress;
}

/** `/vocabulary/basic`: the everyday topics of the basic vocabulary, with the progress of each. */
@Component({
  selector: 'app-basic-vocabulary-page',
  imports: [RouterLink, Button, EmptyState, Icon, ProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow"><a routerLink="/vocabulary/b1">Words</a> &middot; Basic vocabulary</p>
      <h1>Basic vocabulary</h1>
      <p class="lede">
        The everyday words that you need to describe people, places and your daily life in the
        speaking exam. Choose a topic, learn the words, then practise them in five short exercises.
      </p>

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading the topics&hellip;</p>
      } @else if (resource.error()) {
        <app-empty-state
          heading="The topics could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="resource.reload()">Try again</button>
        </app-empty-state>
      } @else {
        <p class="summary" role="status">
          {{ learntTotal() }} of {{ wordTotal() }} words learnt in {{ rows().length }} topics.
        </p>
        <ul class="topics">
          @for (row of rows(); track row.topic.id) {
            <li>
              <span class="badge-icon" aria-hidden="true"
                ><app-icon [name]="row.icon" [size]="28"
              /></span>
              <h2>
                <a [routerLink]="['/vocabulary/basic', row.topic.id]">{{ row.topic.name }}</a>
              </h2>
              <p class="intro">{{ row.topic.intro }}</p>
              <p class="count">{{ row.progress.learnt }} of {{ row.progress.total }} learnt</p>
              <app-progress-bar
                [value]="row.progress.total ? row.progress.learnt / row.progress.total : 0"
                [label]="row.topic.name + ' progress'"
              />
            </li>
          }
        </ul>
        <p class="more">
          <a appButton variant="secondary" routerLink="/practice/speaking">
            Open the speaking kit
            <app-icon name="arrow" />
          </a>
        </p>
      }
    </div>
  `,
  styles: `
    .eyebrow a {
      color: inherit;
    }
    .summary {
      margin: var(--space-4) 0 0;
      font-family: var(--font-mono);
      font-size: var(--step--1);
      color: var(--text-muted);
    }
    .topics {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
      gap: var(--space-4);
      margin: var(--space-5) 0 0;
      padding: 0;
      list-style: none;
    }
    .topics li {
      position: relative;
      display: grid;
      align-content: start;
      gap: var(--space-2);
      padding: var(--space-4);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      box-shadow: 4px 4px 0 var(--shadow-solid);
      transition: transform var(--dur);
    }
    .topics li:hover {
      transform: translate(-2px, -2px);
    }
    .topics li:focus-within {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .badge-icon {
      display: inline-grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--surface-2);
    }
    h2 {
      margin: 0;
      font-size: var(--step-1);
    }
    h2 a {
      color: var(--text);
      text-decoration: none;
    }
    /* The whole card is the link target. */
    h2 a::after {
      content: '';
      position: absolute;
      inset: 0;
    }
    h2 a:focus-visible {
      outline: none;
    }
    .intro,
    .count {
      margin: 0;
    }
    .intro {
      color: var(--text-muted);
    }
    .count {
      font-family: var(--font-mono);
      font-size: var(--step--1);
    }
    .more {
      margin-top: var(--space-7);
    }
  `,
})
export class BasicVocabularyPage {
  protected readonly resource = inject(PracticeCatalogueService).basicVocabulary();
  private readonly store = inject(LocalStorageService);

  protected readonly rows = computed<TopicRow[]>(() => {
    if (!this.resource.hasValue()) return [];
    const { topics, words } = this.resource.value();
    const progress = this.store.practice().basic;
    return topics.map((topic) => ({
      topic,
      icon: topic.icon as IconName,
      progress: topicProgress(
        words.filter((w) => w.t === topic.id),
        progress,
      ),
    }));
  });
  protected readonly wordTotal = computed(() =>
    this.rows().reduce((sum, r) => sum + r.progress.total, 0),
  );
  protected readonly learntTotal = computed(() =>
    this.rows().reduce((sum, r) => sum + r.progress.learnt, 0),
  );
}
