import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { examStatus } from '../../core/progress';
import { LocalStorageService } from '../../core/storage.service';
import { ExamCatalogueService } from '../../data/exam-catalogue.service';
import {
  BrushStroke,
  Button,
  Card,
  Chip,
  Icon,
  IllustratedCard,
  ProgressRing,
  SkillArt,
  type ArtKind,
  type CardTone,
} from '../../shared/ui';

interface SkillCard {
  kind: ArtKind;
  title: string;
  text: string;
  tone: CardTone;
  tilt: number;
}

/** Landing page: hero with the brush stroke, the five skills as illustrated cards, and overall progress. */
@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    BrushStroke,
    Button,
    Card,
    Chip,
    Icon,
    IllustratedCard,
    ProgressRing,
    SkillArt,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero container" aria-labelledby="hero-title">
      <ul class="chips" aria-label="About this app">
        <li><app-chip [command]="true">B1</app-chip></li>
        <li><app-chip>Practice exams</app-chip></li>
        <li><app-chip>Works offline</app-chip></li>
      </ul>
      <h1 id="hero-title">
        <span class="line">Learn</span>
        <span class="line hl">
          <app-brush-stroke class="brush" />
          <span class="hl-text">English</span>
        </span>
      </h1>
      <p class="lede">
        Free, original practice exams for English learners. Read, listen, write and speak, then see
        how you did. Everything stays on your device.
      </p>
      <div class="actions">
        <a appButton variant="primary" size="lg" routerLink="/b1">
          Start B1
          <app-icon name="arrow" [size]="22" />
        </a>
        <a appButton size="lg" routerLink="/settings">Settings</a>
      </div>
    </section>

    @if (hasProgress()) {
      <section class="container progress" aria-labelledby="progress-title">
        <app-card [raised]="true">
          <div class="progress-grid">
            <app-progress-ring
              [value]="overallFraction()"
              [size]="96"
              [text]="completed() + '/' + total()"
              label="B1 exams completed"
            />
            <div>
              <h2 id="progress-title">Your progress</h2>
              <p class="muted">
                {{ started() }} {{ started() === 1 ? 'exam' : 'exams' }} started,
                {{ completed() }} completed
                @if (averageScore() !== null) {
                  &middot; average score <span class="mono">{{ averageScore() }}%</span>
                }
              </p>
              <a appButton size="sm" routerLink="/b1">Continue practising</a>
            </div>
          </div>
        </app-card>
      </section>
    }

    <section class="container skills" aria-labelledby="skills-title">
      <h2 id="skills-title" class="section-title">Practise every skill.</h2>
      <div class="grid">
        @for (skill of skills; track skill.kind) {
          <app-illustrated-card
            [heading]="skill.title"
            [tone]="skill.tone"
            [rotate]="skill.tilt"
            [link]="'/b1'"
          >
            <app-skill-art art [kind]="skill.kind" />
            <p>{{ skill.text }}</p>
          </app-illustrated-card>
        }
      </div>
    </section>
  `,
  styles: `
    .hero {
      padding-block: var(--space-7) var(--space-8);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0 0 var(--space-5);
      padding: 0;
      list-style: none;
    }
    h1 {
      position: relative;
      isolation: isolate;
      margin-bottom: var(--space-5);
      font-size: var(--step-6);
      font-weight: 850;
      line-height: 0.92;
      letter-spacing: -0.055em;
    }
    .line {
      display: block;
    }
    .hl {
      position: relative;
      display: inline-block;
    }
    .hl-text {
      position: relative;
    }
    .brush {
      position: absolute;
      inset: 8% -6% -6% -4%;
      z-index: -1;
    }
    .lede {
      margin-bottom: var(--space-6);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
    }
    .progress {
      padding-bottom: var(--space-8);
    }
    .progress-grid {
      display: flex;
      align-items: center;
      gap: var(--space-5);
    }
    .progress h2 {
      margin-bottom: var(--space-2);
      font-size: var(--step-2);
    }
    .skills {
      padding-bottom: var(--space-9);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 11.5rem), 1fr));
      gap: var(--space-6);
      padding-right: 6px;
    }
    @media (max-width: 30rem) {
      .progress-grid {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `,
})
export class HomePage {
  private readonly store = inject(LocalStorageService);
  private readonly level = signal('b1');
  private readonly index = inject(ExamCatalogueService).levelIndex(this.level);

  protected readonly skills: SkillCard[] = [
    {
      kind: 'reading',
      title: 'Practise reading',
      text: 'Notices, articles and gap-fills with instant marking.',
      tone: 'cream',
      tilt: -1.5,
    },
    {
      kind: 'listening',
      title: 'Practise listening',
      text: 'Short conversations and talks. Play them as often as you need.',
      tone: 'blue',
      tilt: 1.5,
    },
    {
      kind: 'writing',
      title: 'Practise writing',
      text: 'Emails, stories and articles with a checklist for each task.',
      tone: 'green',
      tilt: -1,
    },
    {
      kind: 'speaking',
      title: 'Practise speaking',
      text: 'Record your answers, listen back and compare with model ideas.',
      tone: 'white',
      tilt: 1.25,
    },
    {
      kind: 'mediation',
      title: 'Practise mediation',
      text: 'Pass on information between texts and people in clear English.',
      tone: 'coral',
      tilt: -1.25,
    },
  ];

  private readonly statuses = computed(() => {
    const exams = this.index.hasValue() ? this.index.value().exams : [];
    const progress = this.store.progress();
    return exams.map((exam) => examStatus(exam, progress[exam.id]));
  });

  protected readonly total = computed(() => this.statuses().length);
  protected readonly started = computed(
    () => this.statuses().filter((s) => s.status !== 'not-started').length,
  );
  protected readonly completed = computed(
    () => this.statuses().filter((s) => s.status === 'completed').length,
  );
  protected readonly hasProgress = computed(() => this.started() > 0);
  protected readonly overallFraction = computed(() =>
    this.total() ? this.completed() / this.total() : 0,
  );
  protected readonly averageScore = computed(() => {
    const scores = this.statuses()
      .map((s) => s.scorePercent)
      .filter((s): s is number => s !== null);
    return scores.length ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null;
  });
}
