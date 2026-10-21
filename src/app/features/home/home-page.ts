import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Landing page. Placeholder until the design phase. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Learn English</h1>
    <p>Free, original practice exams for English learners. Start with level B1.</p>
    <p><a routerLink="/b1">Go to B1 practice exams</a></p>
  `,
})
export class HomePage {}
