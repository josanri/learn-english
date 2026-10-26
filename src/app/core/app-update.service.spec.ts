import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, NavigationStart, Router, type Event } from '@angular/router';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdateService } from './app-update.service';

describe('AppUpdateService', () => {
  function setup(isEnabled: boolean, url = '/') {
    const versionUpdates = new Subject<VersionEvent>();
    const routerEvents = new Subject<Event>();
    const checkForUpdate = vi.fn().mockResolvedValue(false);
    const reload = vi.fn();
    const setInterval = vi.fn();
    const listeners = new Map<string, () => void>();
    const fakeDocument = {
      location: { reload },
      visibilityState: 'visible',
      defaultView: { setInterval },
      addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: { isEnabled, versionUpdates, checkForUpdate } },
        { provide: DOCUMENT, useValue: fakeDocument },
        { provide: Router, useValue: { url, events: routerEvents } },
      ],
    });
    TestBed.inject(AppUpdateService);
    const versionReady = () =>
      versionUpdates.next({
        type: 'VERSION_READY',
        currentVersion: { hash: 'a' },
        latestVersion: { hash: 'b' },
      });
    return {
      versionUpdates,
      versionReady,
      routerEvents,
      checkForUpdate,
      reload,
      setInterval,
      listeners,
    };
  }

  it('checks on start, every hour and when the app returns to the foreground', () => {
    const { checkForUpdate, listeners, setInterval } = setup(true);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000);

    listeners.get('visibilitychange')?.();
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('reloads at once when the new version is ready and the learner is on Home', () => {
    const { versionUpdates, versionReady, reload } = setup(true, '/?ref=pwa');

    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    expect(reload).not.toHaveBeenCalled();

    versionReady();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('waits for the next navigation to finish when the learner is on another page', () => {
    const { versionReady, routerEvents, reload } = setup(true, '/exams/b1');

    versionReady();
    expect(reload).not.toHaveBeenCalled();

    routerEvents.next(new NavigationStart(1, '/grammar'));
    expect(reload).not.toHaveBeenCalled();

    routerEvents.next(new NavigationEnd(1, '/grammar', '/grammar'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload on navigation when no new version is ready', () => {
    const { routerEvents, reload } = setup(true, '/exams/b1');

    routerEvents.next(new NavigationEnd(1, '/grammar', '/grammar'));
    expect(reload).not.toHaveBeenCalled();
  });

  it('does nothing when the service worker is disabled', () => {
    const { checkForUpdate, listeners } = setup(false);
    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });
});
