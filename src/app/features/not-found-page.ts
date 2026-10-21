import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, EmptyState } from '../shared/ui';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, Button, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <h1>Page not found</h1>
      <app-empty-state heading="There is nothing at this address" icon="alert">
        <a appButton variant="primary" routerLink="/">Back to the home page</a>
      </app-empty-state>
    </div>
  `,
})
export class NotFoundPage {}
