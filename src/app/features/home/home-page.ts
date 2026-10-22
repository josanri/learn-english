import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InstallService } from '../../core/install.service';
import { ExamCatalogueService } from '../../data/exam-catalogue.service';
import { ProgressSummary } from '../progress/progress-summary';
import {
  Button,
  Chip,
  Icon,
  IllustratedCard,
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

/** Landing page: hero with the speech bubble, the five skills as illustrated cards, and overall progress. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, Button, Chip, Icon, IllustratedCard, SkillArt, ProgressSummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero container" aria-labelledby="hero-title">
      <ul class="chips" aria-label="About this app">
        <li><app-chip>Practice exams</app-chip></li>
        <li><app-chip>Works offline</app-chip></li>
      </ul>
      <h1 id="hero-title">
        <span class="line">Learn</span>
        <span class="bubble">
          English
          <svg class="tail" viewBox="0 0 40 32" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0 L6 32 L34 0" />
          </svg>
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
        @if (install.canInstall()) {
          <button appButton size="lg" type="button" (click)="install.install()">
            <app-icon name="download" [size]="22" />
            Install app
          </button>
        }
        <a appButton size="lg" routerLink="/settings">Settings</a>
      </div>
    </section>

    <section class="container progress">
      <app-progress-summary [exams]="exams()" />
    </section>

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
      margin-bottom: calc(0.34em + var(--space-4));
      font-size: var(--step-6);
      font-weight: 850;
      line-height: 0.92;
      letter-spacing: -0.055em;
    }
    .line {
      display: block;
    }
    /* "English" in a speech bubble: same paper, border and offset shadow as the skill cards. */
    .bubble {
      position: relative;
      display: inline-block;
      margin-top: 0.08em;
      padding: 0.02em 0.22em 0.1em;
      border: var(--bw-card) solid var(--card-border);
      border-radius: 0.22em;
      background: var(--paper-blue);
      box-shadow: 0.07em 0.07em 0 var(--shadow-solid);
      color: var(--paper-ink);
      transform: rotate(-2.5deg);
      transform-origin: left bottom;
      animation: pop calc(var(--dur-draw) * 0.45) cubic-bezier(0.3, 1.6, 0.5, 1) 0.15s both;
    }
    .tail {
      position: absolute;
      top: calc(100% - var(--bw-card));
      left: 0.45em;
      width: 0.42em;
      height: 0.34em;
      overflow: visible;
    }
    .tail path {
      fill: var(--paper-blue);
      stroke: var(--card-border);
      stroke-width: var(--bw-card);
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: rotate(-2.5deg) scale(0.6);
      }
    }
    .lede {
      margin-bottom: var(--space-6);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
    }
    .progress:has(app-card) {
      padding-bottom: var(--space-8);
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
  `,
})
export class HomePage {
  protected readonly install = inject(InstallService);
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
      text: 'Emails, stories and articles, with spelling and grammar hints as you type.',
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

  protected readonly exams = computed(() =>
    this.index.hasValue() ? this.index.value().exams : [],
  );
}
