import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { SpeechService } from '../../core/speech.service';
import type { BasicWord, PhrasalProgress } from '../../models/practice';
import { Icon, type IconName } from '../../shared/ui';
import { isLearnt, parseExample } from './basic-engine';

export interface WordGroup {
  name: string;
  words: BasicWord[];
}

/**
 * The "Learn" view of a basic vocabulary topic: the words by group, each with a picture slot, its
 * definition, an example and a listen button, then the model sentences of the topic.
 */
@Component({
  selector: 'app-basic-word-list',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (group of groups(); track group.name) {
      <section class="group" [attr.aria-labelledby]="'g-' + $index">
        <h2 [id]="'g-' + $index">{{ group.name }}</h2>
        <ul class="words">
          @for (w of group.words; track w.id) {
            <li>
              @if (w.img) {
                <span class="pic" aria-hidden="true">
                  <img class="art" [src]="w.img" alt="" loading="lazy" decoding="async" />
                </span>
              } @else {
                <span class="pic empty" aria-hidden="true"
                  ><app-icon [name]="icon()" [size]="28"
                /></span>
              }
              <div class="text">
                <p class="word">
                  <span>{{ w.w }}</span>
                  @if (learnt(w)) {
                    <span class="learnt"><app-icon name="check" [size]="16" /> learnt</span>
                  }
                </p>
                <p class="meaning">{{ w.d }}</p>
                <p class="ex">
                  <!-- One element per piece, so no extra spaces appear before punctuation. -->
                  @for (part of parts(w); track $index) {
                    <span [class.mark]="part.marked">{{ part.text }}</span>
                  }
                </p>
              </div>
              @if (canSpeak) {
                <button
                  type="button"
                  class="say"
                  [attr.aria-label]="'Listen to ' + w.w"
                  (click)="say(w.w)"
                >
                  <app-icon name="volume" />
                </button>
              }
            </li>
          }
        </ul>
      </section>
    }

    <section class="phrases" aria-labelledby="phrases-title">
      <h2 id="phrases-title">Useful sentences</h2>
      <ul>
        @for (p of phrases(); track $index) {
          <li>
            <span>{{ p }}</span>
            @if (canSpeak) {
              <button
                type="button"
                class="say"
                [attr.aria-label]="'Listen to: ' + p"
                (click)="say(p)"
              >
                <app-icon name="volume" />
              </button>
            }
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .group + .group,
    .phrases {
      margin-top: var(--space-6);
    }
    h2 {
      margin-bottom: var(--space-4);
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .words {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
      gap: var(--space-3);
    }
    .words li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: start;
      gap: var(--space-3);
      padding: var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    /* Picture slot: the full-colour drawing of the word on a white paper tile, the same in both
       themes (the colours are made for a light ground), otherwise the topic icon in a dashed box. */
    .pic {
      display: grid;
      place-items: center;
      width: 4rem;
      height: 4rem;
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--paper-white);
    }
    .art {
      display: block;
      width: 3.5rem;
      height: 3.5rem;
    }
    .pic.empty {
      border-style: dashed;
      background: var(--surface-2);
      color: var(--text-muted);
    }
    .text {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }
    .text p {
      margin: 0;
    }
    .word {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--step-1);
      font-weight: 800;
    }
    .learnt {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-family: var(--font-mono);
      font-size: var(--step--1);
      font-weight: 500;
      color: var(--success);
    }
    .meaning {
      color: var(--text-muted);
    }
    .ex {
      font-style: italic;
    }
    .ex .mark {
      font-style: normal;
      font-weight: 700;
    }
    .say {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: var(--target);
      height: var(--target);
      padding: 0;
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
    }
    .say:hover {
      background: var(--surface-2);
    }
    .say:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .phrases ul {
      display: grid;
      gap: var(--space-2);
      max-width: 44rem;
    }
    .phrases li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-left: var(--bw-card) solid var(--accent);
      background: var(--surface);
    }
  `,
})
export class BasicWordList {
  readonly groups = input.required<readonly WordGroup[]>();
  readonly phrases = input.required<readonly string[]>();
  /** Icon of the topic, shown in the picture slot of a word without a picture. */
  readonly icon = input.required<IconName>();
  readonly progress = input.required<Readonly<Record<string, PhrasalProgress>>>();

  private readonly speech = inject(SpeechService);
  protected readonly canSpeak = this.speech.supported;

  protected learnt(word: BasicWord): boolean {
    return isLearnt(this.progress()[word.id]);
  }

  protected parts(word: BasicWord) {
    return parseExample(word.e);
  }

  protected say(text: string): void {
    void this.speech.speakText(text);
  }
}
