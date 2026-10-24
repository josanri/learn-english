import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GrammarCatalogueService } from '../../../data/grammar-catalogue.service';
import { Badge, Button, Card, Chip, EmptyState, Icon } from '../../../shared/ui';
import { TenseTimeline } from './tense-timeline';

/** `/grammar/:guide`: one grammar guide (contents list, tables, uses, mistakes and quick checks) loaded from `assets/grammar/guides/<id>.json`. */
@Component({
  selector: 'app-guide-page',
  imports: [RouterLink, Badge, Button, Card, Chip, EmptyState, Icon, TenseTimeline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">
        <a routerLink="/grammar">Grammar</a>
        @if (data(); as g) {
          &middot; {{ g.level === 'B2' ? 'B1 to B2' : 'B1' }}
        }
      </p>
      <h1>{{ data()?.title ?? 'Grammar' }}</h1>
      @if (data(); as g) {
        <p class="lede">{{ g.intro }}</p>
      }

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading the guide&hellip;</p>
      } @else if (resource.error()) {
        <app-empty-state
          heading="The guide could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="resource.reload()">Try again</button>
        </app-empty-state>
      } @else {
        @if (data()?.timeline; as rows) {
          <app-tense-timeline [rows]="rows" (go)="go($event)" />
        }
        <div class="layout">
          <nav class="contents fold-side" aria-label="Contents">
            <ol>
              @for (section of sections(); track section.id) {
                <li>
                  <button type="button" (click)="go(section.id)">{{ section.title }}</button>
                </li>
              }
            </ol>
          </nav>

          <div class="sections">
            @for (section of sections(); track section.id) {
              <section class="section" [attr.aria-labelledby]="'h-' + section.id">
                <h2 [id]="'h-' + section.id" tabindex="-1">
                  {{ section.title }}
                  @if (section.level) {
                    <app-badge>{{ section.level }}</app-badge>
                  }
                </h2>
                <p class="summary">{{ section.summary }}</p>

                @for (table of section.tables; track table.caption) {
                  <div
                    class="table-wrap"
                    role="region"
                    tabindex="0"
                    [attr.aria-label]="table.caption"
                  >
                    <table>
                      <caption>
                        {{
                          table.caption
                        }}
                      </caption>
                      <thead>
                        <tr>
                          @for (cell of table.head; track $index) {
                            <th scope="col">{{ cell }}</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of table.rows; track $index) {
                          <tr>
                            @for (cell of row; track $index) {
                              @if ($first) {
                                <th scope="row">{{ cell }}</th>
                              } @else {
                                <td>{{ cell }}</td>
                              }
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }

                <h3>How to use it</h3>
                <ul>
                  @for (use of section.uses; track use) {
                    <li>{{ use }}</li>
                  }
                </ul>

                @if (section.signals.length > 0) {
                  <h3>Signal words</h3>
                  <ul class="signals">
                    @for (word of section.signals; track word) {
                      <li>
                        <app-chip [prompt]="false">{{ word }}</app-chip>
                      </li>
                    }
                  </ul>
                }

                <h3>Examples</h3>
                <ul class="examples">
                  @for (example of section.examples; track example.text) {
                    <li>
                      <span class="sentence">{{ example.text }}</span>
                      @if (example.note) {
                        <span class="muted"> &mdash; {{ example.note }}</span>
                      }
                    </li>
                  }
                </ul>

                <h3>Common mistakes</h3>
                <ul class="mistakes">
                  @for (mistake of section.mistakes; track mistake.wrong) {
                    <li>
                      <p class="wrong">
                        <app-icon name="cross" [size]="18" />
                        <span><span class="visually-hidden">Wrong: </span>{{ mistake.wrong }}</span>
                      </p>
                      <p class="right">
                        <app-icon name="check" [size]="18" />
                        <span><span class="visually-hidden">Right: </span>{{ mistake.right }}</span>
                      </p>
                      <p class="muted why">{{ mistake.why }}</p>
                    </li>
                  }
                </ul>

                <h3>Check yourself</h3>
                <ol class="checks">
                  @for (check of section.checks; track check.question) {
                    <li>
                      <p>{{ check.question }}</p>
                      <details>
                        <summary>Show the answer</summary>
                        <p>
                          <strong>{{ check.answer }}</strong>
                        </p>
                        <p class="muted">{{ check.explanation }}</p>
                      </details>
                    </li>
                  }
                </ol>
              </section>
            }
          </div>
        </div>

        @if (data()?.sources?.length) {
          <app-card class="cta">
            <h2>Read more</h2>
            <ul class="sources">
              @for (source of data()?.sources; track source.url) {
                <li>
                  <a [href]="source.url" target="_blank" rel="noopener noreferrer">{{
                    source.label
                  }}</a>
                </li>
              }
            </ul>
          </app-card>
        }
        <p class="back">
          <a appButton variant="primary" routerLink="/grammar">
            All grammar guides
            <app-icon name="arrow" [size]="20" />
          </a>
        </p>
      }
    </div>
  `,
  styles: `
    .eyebrow a {
      color: inherit;
    }
    .layout {
      display: grid;
      gap: var(--space-6);
      margin-block: var(--space-6);
    }
    .contents ol {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .contents button {
      min-height: var(--target);
      padding: 0 var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .contents button:hover {
      background: var(--surface-2);
    }
    .section {
      padding-block: var(--space-6);
      border-top: var(--bw) solid var(--border-muted);
    }
    .section h2 {
      font-size: var(--step-3);
    }
    .section h3 {
      margin: var(--space-5) 0 var(--space-2);
      font-size: var(--step-0);
      font-family: var(--font-mono);
      font-weight: 500;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .summary {
      max-width: 40rem;
      font-size: var(--step-1);
    }
    .table-wrap {
      margin-block: var(--space-4);
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: var(--bw) solid var(--border-muted);
      background: var(--surface);
    }
    caption {
      padding: var(--space-2) 0;
      color: var(--text-muted);
      font-size: var(--step--1);
      text-align: start;
    }
    th,
    td {
      padding: var(--space-2) var(--space-3);
      border: var(--bw) solid var(--border-muted);
      text-align: start;
      vertical-align: top;
    }
    thead th {
      background: var(--surface-2);
    }
    ul,
    ol.checks {
      margin: 0;
      padding-inline-start: var(--space-5);
    }
    li {
      margin-bottom: var(--space-2);
    }
    .signals {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      padding: 0;
      list-style: none;
    }
    .signals li {
      margin: 0;
    }
    .sentence {
      font-weight: 700;
    }
    .mistakes {
      padding: 0;
      list-style: none;
    }
    .mistakes li {
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .mistakes p {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      margin: 0;
    }
    .wrong {
      color: var(--danger);
      text-decoration: line-through;
    }
    .right {
      color: var(--success);
      font-weight: 700;
    }
    .why {
      margin-top: var(--space-1);
    }
    details summary {
      min-height: var(--target);
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: 700;
    }
    .cta {
      margin-top: var(--space-7);
    }
    .sources {
      margin: 0;
    }
    .back {
      margin-top: var(--space-6);
    }

    @media (min-width: 64rem) {
      .layout {
        grid-template-columns: 15rem minmax(0, 1fr);
        align-items: start;
      }
      .contents {
        position: sticky;
        top: calc(var(--header-height) + var(--space-4));
      }
      .contents ol {
        flex-direction: column;
        gap: var(--space-1);
      }
      .contents button {
        width: 100%;
        text-align: start;
      }
    }
    /* Split screen held like a book: the contents fill the right screen as a list (.fold-side). */
    :host-context(html[data-fold='book']) .layout {
      grid-template-columns: minmax(0, 1fr);
    }
    :host-context(html[data-fold='book']) .contents ol {
      flex-direction: column;
      gap: var(--space-1);
    }
    :host-context(html[data-fold='book']) .contents button {
      width: 100%;
      text-align: start;
    }
  `,
})
export class GuidePage {
  /** Bound from the route parameter `:guide`. */
  readonly guide = input.required<string>();
  private readonly document = inject(DOCUMENT);

  protected readonly resource = inject(GrammarCatalogueService).guide(() => this.guide());
  protected readonly data = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );
  protected readonly sections = computed(() => this.data()?.sections ?? []);

  /** Scrolls to a section and moves focus to its heading. */
  protected go(id: string): void {
    const heading = this.document.getElementById(`h-${id}`);
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }
}
