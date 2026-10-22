import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { AudioDbService } from './core/audio-db.service';
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
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(InstallService); // Starts listening for the browser's install offer early.
      // One-off recording migrations (React-era copy, then attempt ids in keys); failures are ignored and retried later.
      void inject(AudioDbService).runMigrations();
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
