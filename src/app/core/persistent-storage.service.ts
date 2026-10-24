import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** `granted`: the browser keeps the data; `best-effort`: it may delete it; `unsupported`: no API. */
export type PersistenceStatus = 'unknown' | 'granted' | 'best-effort' | 'unsupported';

/**
 * Asks the browser to keep this site's storage (localStorage and IndexedDB) under storage pressure.
 * Without it, some browsers (Safari above all) can delete the progress of a site that was not visited
 * for a few days. The request is silent: browsers grant or refuse it from their own rules.
 */
@Injectable({ providedIn: 'root' })
export class PersistentStorageService {
  private readonly manager = inject(DOCUMENT).defaultView?.navigator?.storage;
  private readonly _status = signal<PersistenceStatus>('unknown');
  private requested = false;

  readonly status = this._status.asReadonly();

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.manager?.persisted) {
      this._status.set('unsupported');
      return;
    }
    try {
      this._status.set((await this.manager.persisted()) ? 'granted' : 'best-effort');
    } catch {
      this._status.set('unsupported');
    }
  }

  /** Asks once per page load; later calls do nothing. */
  async request(): Promise<void> {
    if (this.requested || !this.manager?.persist) return;
    this.requested = true;
    try {
      this._status.set((await this.manager.persist()) ? 'granted' : 'best-effort');
    } catch {
      // Keep the last known status.
    }
  }
}
