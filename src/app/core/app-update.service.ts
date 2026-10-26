import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/** How often a running app asks the server for a new version. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Keeps the installed app up to date. The Angular service worker downloads a new version in the
 * background but keeps serving the old one until the page reloads, and an installed PWA is rarely
 * reloaded. This service checks for a new version on start, when the app comes back to the
 * foreground and every hour, and reloads once the new version is ready.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly sw = inject(SwUpdate);
  private readonly doc = inject(DOCUMENT);

  constructor() {
    if (!this.sw.isEnabled) return;

    this.sw.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.doc.location.reload());

    this.doc.addEventListener('visibilitychange', () => {
      if (this.doc.visibilityState === 'visible') this.check();
    });
    this.doc.defaultView?.setInterval(() => this.check(), CHECK_INTERVAL_MS);
    this.check();
  }

  private check(): void {
    // Fails while offline or before the worker is registered; the next check retries.
    this.sw.checkForUpdate().catch(() => undefined);
  }
}
