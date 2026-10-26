import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { AppUpdateService } from './core/app-update.service';
import { AudioDbService } from './core/audio-db.service';
import { FoldPosture } from './core/fold-posture.service';
import { InstallService } from './core/install.service';
import { ThemeService } from './core/theme.service';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    // Clean URLs: GitHub Pages serves 404.html (a copy of index.html) for deep links, see scripts/build-pages.mjs.
    provideRouter(
      routes,
      withComponentInputBinding(),
      // A new page opens at the top; Back returns to the old position.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(FoldPosture); // Sets data-fold on <html> when a foldable phone is half-folded.
      inject(InstallService); // Starts listening for the browser's install offer early.
      inject(AppUpdateService); // Checks for a new deployed version and reloads when it is ready.
      // One-off recording migrations (React-era copy, then attempt ids in keys); failures are ignored and retried later.
      void inject(AudioDbService).runMigrations();
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
