import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/** How often a running app asks the server for a new version. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Keeps the installed app up to date. The Angular service worker downloads a new version in the
 * background but keeps serving the old one until the page reloads, and an installed PWA is rarely
 * reloaded. This service checks for a new version on start, when the app comes back to the
 * foreground and every hour.
 *
 * Once the new version is ready the page reloads straight away when the learner is on Home, and
 * otherwise waits for the next navigation, so an exam or a recording is never cut off.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly sw = inject(SwUpdate);
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private updateReady = false;

  constructor() {
    if (!this.sw.isEnabled) return;

    this.sw.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateReady = true;
        if (this.onHome()) this.reload();
      });

    // The address bar already shows the new page when navigation ends, so the reload opens it.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.reload());

    this.doc.addEventListener('visibilitychange', () => {
      if (this.doc.visibilityState === 'visible') this.check();
    });
    this.doc.defaultView?.setInterval(() => this.check(), CHECK_INTERVAL_MS);
    this.check();
  }

  private onHome(): boolean {
    return this.router.url.split(/[?#]/)[0] === '/';
  }

  private reload(): void {
    if (this.updateReady) this.doc.location.reload();
  }

  private check(): void {
    // Fails while offline or before the worker is registered; the next check retries.
    this.sw.checkForUpdate().catch(() => undefined);
  }
}
