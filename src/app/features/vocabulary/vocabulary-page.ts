import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { VocabularyFile } from '../../models/vocabulary';
import { Badge, Button, EmptyState, Icon } from '../../shared/ui';
import { dictionaryUrl, filterWords } from './vocabulary-engine';

const PAGE_SIZE = 100;
const LETTERS = ['all', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
const POS_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'n', label: 'Nouns' },
  { value: 'v', label: 'Verbs' },
  { value: 'adj', label: 'Adjectives' },
  { value: 'adv', label: 'Adverbs' },
  { value: 'prep', label: 'Prepositions' },
  { value: 'conj', label: 'Conjunctions' },
  { value: 'pron', label: 'Pronouns' },
  { value: 'det', label: 'Determiners' },
  { value: 'phr', label: 'Phrasal verbs' },
];

/** `/vocabulary`: the B1 Preliminary word list with search and filters; each word links to the Cambridge Dictionary. */
@Component({
  selector: 'app-vocabulary-page',
  imports: [RouterLink, Badge, Button, EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">Vocabulary &middot; B1</p>
      <h1>B1 vocabulary</h1>
      <p class="lede">
        The words a B1 learner needs, taken from the Cambridge B1 Preliminary vocabulary list. Open
        a word to see its meaning in the Cambridge Dictionary.
      </p>
      <ul class="practise" aria-label="Practise words">
        <li>
          <a appButton variant="primary" routerLink="/vocabulary/flashcards">
            <app-icon name="repeat" />
            Flashcards
          </a>
        </li>
        <li>
          <a appButton routerLink="/vocabulary/phrasal-verbs">
            <app-icon name="list" />
            Phrasal verbs
          </a>
        </li>
        <li>
          <a appButton routerLink="/reader">
            <app-icon name="book" />
            Graded reader
          </a>
        </li>
      </ul>

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading the word list&hellip;</p>
      } @else if (resource.error()) {
        <app-empty-state
          heading="The word list could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="resource.reload()">Try again</button>
        </app-empty-state>
      } @else if (data(); as file) {
        <div class="filters">
          <div class="field">
            <label for="word-search">Search a word</label>
            <input
              id="word-search"
              type="search"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              [value]="query()"
              (input)="setQuery($any($event.target).value)"
            />
          </div>
          <div class="field">
            <label for="word-topic">Topic</label>
            <select
              id="word-topic"
              [value]="topic()"
              (change)="setTopic($any($event.target).value)"
            >
              <option value="all">All words</option>
              @for (item of file.topics; track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="word-pos">Type of word</label>
            <select id="word-pos" [value]="pos()" (change)="setPos($any($event.target).value)">
              @for (option of posOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>

        <nav class="letters" aria-label="First letter">
          @for (item of letters; track item) {
            <button type="button" [attr.aria-pressed]="letter() === item" (click)="setLetter(item)">
              {{ item === 'all' ? 'All' : item }}
            </button>
          }
        </nav>

        <p class="muted count" role="status">
          {{ matches().length }} of {{ file.words.length }} words
        </p>

        @if (matches().length === 0) {
          <app-empty-state
            heading="No words found"
            description="Try another word or change the filters."
            icon="info"
          />
        } @else {
          <ul class="words">
            @for (word of shown(); track $index) {
              <li>
                <a
                  class="word"
                  [href]="url(word.w)"
                  target="_blank"
                  rel="noopener noreferrer"
                  [attr.aria-label]="word.w + ', open in the Cambridge Dictionary (new tab)'"
                >
                  {{ word.w }}
                </a>
                @if (word.p) {
                  <app-badge>{{ word.p }}</app-badge>
                }
                @if (word.r) {
                  <app-badge>{{ word.r === 'Br' ? 'British' : 'American' }}</app-badge>
                }
                @if (word.e) {
                  <span class="muted example">{{ word.e }}</span>
                }
              </li>
            }
          </ul>
          @if (matches().length > shown().length) {
            <div class="more">
              <button appButton type="button" (click)="limit.set(limit() + pageSize)">
                Show more words
                <app-icon name="arrow" [size]="18" />
              </button>
            </div>
          }
        }

        <p class="muted source">
          Source: {{ file.source.publisher }},
          <a [href]="file.source.url" target="_blank" rel="noopener noreferrer">{{
            file.source.title
          }}</a
          >. Word types and example phrases come from the list. The list does not cover every word
          in an exam.
        </p>
      }
    </div>
  `,
  styles: `
    .practise {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin: var(--space-5) 0 var(--space-6);
      padding: 0;
      list-style: none;
    }
    .filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
      gap: var(--space-4);
      margin-block: var(--space-5) var(--space-3);
    }
    .filters .field {
      margin-bottom: 0;
    }
    .letters {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin-bottom: var(--space-4);
    }
    .letters button {
      min-width: var(--target);
      min-height: var(--target);
      padding: 0 var(--space-2);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .letters button[aria-pressed='true'] {
      border-color: var(--border);
      background: var(--accent-strong);
      color: var(--on-accent);
    }
    .count {
      margin: 0 0 var(--space-3);
      font-size: var(--step--1);
    }
    .words {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
      gap: var(--space-2) var(--space-5);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .words li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target);
      padding-block: var(--space-1);
      border-bottom: var(--bw) solid var(--border-muted);
    }
    .word {
      color: var(--accent-text);
      font-weight: 700;
    }
    .example {
      flex-basis: 100%;
      font-size: var(--step--1);
    }
    .more {
      margin-top: var(--space-5);
    }
    .source {
      margin-top: var(--space-7);
      font-size: var(--step--1);
    }
  `,
})
export class VocabularyPage {
  protected readonly pageSize = PAGE_SIZE;
  protected readonly letters = LETTERS;
  protected readonly posOptions = POS_OPTIONS;

  protected readonly resource = httpResource<VocabularyFile>(
    () => 'assets/vocabulary/b1-preliminary.json',
  );
  protected readonly data = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  protected readonly query = signal('');
  protected readonly topic = signal('all');
  protected readonly letter = signal('all');
  protected readonly pos = signal('all');
  protected readonly limit = signal(PAGE_SIZE);

  protected readonly matches = computed(() =>
    filterWords(this.data()?.words ?? [], {
      query: this.query(),
      topic: this.topic(),
      letter: this.letter(),
      pos: this.pos(),
    }),
  );
  protected readonly shown = computed(() => this.matches().slice(0, this.limit()));

  protected setQuery(value: string): void {
    this.query.set(value);
    this.limit.set(PAGE_SIZE);
  }
  protected setTopic(value: string): void {
    this.topic.set(value);
    this.limit.set(PAGE_SIZE);
  }
  protected setPos(value: string): void {
    this.pos.set(value);
    this.limit.set(PAGE_SIZE);
  }
  protected setLetter(value: string): void {
    this.letter.set(value);
    this.limit.set(PAGE_SIZE);
  }

  protected url(word: string): string {
    return dictionaryUrl(word);
  }
}
