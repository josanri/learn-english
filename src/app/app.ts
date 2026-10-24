import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SettingsService } from './core/settings.service';
import type { ThemePreference } from './models/storage';
import { Icon, LogoMark, SkipLink, ToastHost, type IconName } from './shared/ui';

const THEME_ORDER: ThemePreference[] = ['light', 'dark', 'system'];
const THEME_ICON: Record<ThemePreference, IconName> = {
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
};
const THEME_NAME: Record<ThemePreference, string> = {
  light: 'light',
  dark: 'dark',
  system: 'system',
};

/** App shell: sticky header with brand and theme toggle, main navigation (bottom bar on phones) and footer. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, LogoMark, SkipLink, ToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-skip-link target="main" />
    <header class="site-header">
      <div class="bar container">
        <a routerLink="/" class="brand" aria-label="Learn English, home">
          <app-logo-mark />
          <span>Learn English</span>
        </a>
        <nav aria-label="Main">
          <a
            routerLink="/"
            routerLinkActive="active"
            ariaCurrentWhenActive="page"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <app-icon name="home" />
            <span>Home</span>
          </a>
          <a routerLink="/exams/b1" routerLinkActive="active" ariaCurrentWhenActive="page">
            <app-icon name="list" />
            <span>B1 exams</span>
          </a>
          <a routerLink="/grammar" routerLinkActive="active" ariaCurrentWhenActive="page">
            <app-icon name="book" />
            <span>Grammar</span>
          </a>
          <a routerLink="/vocabulary/b1" routerLinkActive="active" ariaCurrentWhenActive="page">
            <app-icon name="chat" />
            <span>Words</span>
          </a>
          <a routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page">
            <app-icon name="settings" />
            <span>Settings</span>
          </a>
        </nav>
        <button
          type="button"
          class="theme-toggle"
          [attr.aria-label]="themeLabel()"
          [title]="themeLabel()"
          (click)="cycleTheme()"
        >
          <app-icon [name]="themeIcon()" [size]="22" />
        </button>
      </div>
    </header>
    <main id="main">
      <router-outlet />
    </main>
    <footer class="site-footer container">
      <p>
        Original practice material. Results are for practice only and are not an official score.
        <a routerLink="/credits">Image credits</a>
      </p>
    </footer>
    <app-toast-host />
  `,
  styles: `
    :host {
      display: block;
    }
    .site-header {
      position: sticky;
      top: 0;
      z-index: 40;
      padding-top: env(safe-area-inset-top);
      border-bottom: var(--bw) solid var(--border);
      background: var(--bg);
    }
    /* Half-folded phone held like a laptop: the top screen is short, so this header scrolls away. */
    :host-context(html[data-fold='laptop']) .site-header {
      position: static;
    }
    .bar {
      display: flex;
      align-items: center;
      gap: var(--space-5);
      min-height: var(--header-height);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target);
      color: var(--text);
      font-family: var(--font-display);
      font-size: var(--step-1);
      font-weight: 800;
      letter-spacing: -0.04em;
      text-decoration: none;
      white-space: nowrap;
    }
    nav {
      display: flex;
      gap: var(--space-1);
      margin-inline-start: auto;
    }
    nav a {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target);
      padding: 0 var(--space-3);
      white-space: nowrap;
      border-radius: var(--radius);
      color: var(--text);
      font-weight: 700;
      text-decoration: none;
    }
    nav a:hover {
      background: var(--surface-2);
    }
    nav a.active {
      background: var(--text);
      color: var(--bg);
    }
    .theme-toggle {
      display: grid;
      place-items: center;
      width: var(--target);
      height: var(--target);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
    }
    .theme-toggle:hover {
      background: var(--surface-2);
    }
    main {
      min-height: calc(100vh - var(--header-height) - 6rem);
      min-height: calc(100dvh - var(--header-height) - 6rem);
    }
    main:focus {
      outline: none;
    }
    .site-footer {
      padding-block: var(--space-6);
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .site-footer a {
      display: inline-flex;
      align-items: center;
      min-height: var(--target);
      color: var(--accent-text);
      font-weight: 700;
    }

    @media (min-width: 48rem) and (max-width: 63.99rem) {
      nav app-icon {
        display: none;
      }
    }

    @media (max-width: 47.99rem) {
      .bar {
        justify-content: space-between;
      }
      nav {
        position: fixed;
        inset: auto 0 0 0;
        z-index: 50;
        justify-content: space-around;
        gap: 0;
        margin: 0;
        padding: var(--space-1) var(--space-2) calc(var(--space-1) + env(safe-area-inset-bottom));
        padding-inline: max(var(--space-2), env(safe-area-inset-left))
          max(var(--space-2), env(safe-area-inset-right));
        border-top: var(--bw) solid var(--border);
        background: var(--bg);
      }
      nav a {
        flex: 1 1 0;
        min-width: 0;
        flex-direction: column;
        justify-content: center;
        gap: 2px;
        min-height: 3.25rem;
        padding: 0 var(--space-1);
        font-size: 0.75rem;
        white-space: nowrap;
        text-align: center;
      }
      .site-footer {
        padding-bottom: calc(
          var(--bottom-nav-height) + var(--space-5) + env(safe-area-inset-bottom)
        );
      }
    }

    /*
     * Split screen held like a book (half-folded phone, or Surface Duo with its hinge): the brand and
     * the theme button stay on the left screen, the links sit at the top of the right screen, above
     * its panel, in the compact phone style. Nothing crosses the fold, whatever the viewport width.
     */
    :host-context(html[data-fold='book']) .theme-toggle {
      margin-inline-start: auto;
    }
    :host-context(html[data-fold='book']) nav {
      position: fixed;
      inset: env(safe-area-inset-top) 0 auto auto;
      z-index: 50;
      box-sizing: border-box;
      width: var(--fold-seg-2);
      min-height: var(--header-height);
      justify-content: space-around;
      gap: 0;
      margin: 0;
      padding: var(--space-1) var(--space-2);
      border: 0;
      background: var(--bg);
    }
    :host-context(html[data-fold='book']) nav a {
      flex: 1 1 0;
      min-width: 0;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      min-height: 3.25rem;
      padding: 0 var(--space-1);
      font-size: 0.75rem;
      text-align: center;
    }
    :host-context(html[data-fold='book']) nav app-icon {
      display: inline-flex;
    }
  `,
})
export class App {
  private readonly settings = inject(SettingsService);

  protected readonly themeIcon = computed(() => THEME_ICON[this.settings.settings().theme]);
  protected readonly themeLabel = computed(() => {
    const current = this.settings.settings().theme;
    return `Colour theme: ${THEME_NAME[current]}. Activate to change.`;
  });

  protected cycleTheme(): void {
    const current = this.settings.settings().theme;
    const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
    this.settings.setTheme(next);
  }
}
