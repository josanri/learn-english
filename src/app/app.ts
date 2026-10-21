import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="site-header">
      <a routerLink="/" class="brand">Learn English</a>
      <nav aria-label="Main">
        <a routerLink="/b1">B1</a>
        <a routerLink="/settings">Settings</a>
      </nav>
    </header>
    <main>
      <router-outlet />
    </main>
  `,
})
export class App {}
