import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

/** Chromium event that lets the page open the browser's own install dialog. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Real PWA install. Chromium browsers fire `beforeinstallprompt` once the app is installable
 * (manifest, icons and service worker); the event is kept until the learner presses Install.
 * Safari on iOS has no such event, so the page shows the manual steps instead.
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly win = inject(DOCUMENT).defaultView;
  private deferred: BeforeInstallPromptEvent | null = null;

  /** True after the browser offered the install dialog and it has not been used yet. */
  readonly canInstall = signal(false);
  /** True when the app already runs as an installed app (standalone window). */
  readonly installed = signal(this.isStandalone());
  /** True on iPhone and iPad, where the install is done from the Share menu. */
  readonly needsManualSteps = computed(() => this.isIos() && !this.installed());

  constructor() {
    this.win?.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });
    this.win?.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canInstall.set(false);
      this.installed.set(true);
    });
  }

  /** Opens the browser install dialog. Returns true when the learner accepted. */
  async install(): Promise<boolean> {
    const event = this.deferred;
    if (!event) return false;
    this.deferred = null;
    this.canInstall.set(false);
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted';
  }

  private isStandalone(): boolean {
    const nav = this.win?.navigator as (Navigator & { standalone?: boolean }) | undefined;
    return (
      this.win?.matchMedia?.('(display-mode: standalone)').matches === true ||
      nav?.standalone === true
    );
  }

  private isIos(): boolean {
    const ua = this.win?.navigator.userAgent ?? '';
    return /iphone|ipad|ipod/i.test(ua);
  }
}
