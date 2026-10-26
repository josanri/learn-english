import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  function setup(isEnabled: boolean) {
    const versionUpdates = new Subject<VersionEvent>();
    const checkForUpdate = vi.fn().mockResolvedValue(false);
    const reload = vi.fn();
    const listeners = new Map<string, () => void>();
    const fakeDocument = {
      location: { reload },
      visibilityState: 'visible',
      defaultView: { setInterval: vi.fn() },
      addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: { isEnabled, versionUpdates, checkForUpdate } },
        { provide: DOCUMENT, useValue: fakeDocument },
      ],
    });
    TestBed.inject(AppUpdateService);
    return { versionUpdates, checkForUpdate, reload, listeners };
  }

  it('checks on start and when the app returns to the foreground', () => {
    const { checkForUpdate, listeners } = setup(true);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);

    listeners.get('visibilitychange')?.();
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('reloads once a new version is ready', () => {
    const { versionUpdates, reload } = setup(true);

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    expect(reload).not.toHaveBeenCalled();

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the service worker is disabled', () => {
    const { checkForUpdate, listeners } = setup(false);
    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });
});
