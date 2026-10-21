import type { Routes } from '@angular/router';

const skillRoute = (skill: string) => ({
  path: skill,
  data: { skill },
  loadComponent: () => import('./features/exam/section-page').then((m) => m.SectionPage),
});

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Learn English',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    // One branch per level. Parameters and data are inherited by children (see paramsInheritanceStrategy).
    path: 'b1',
    data: { level: 'b1' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'B1 exams | Learn English',
        loadComponent: () => import('./features/level/level-page').then((m) => m.LevelPage),
      },
      {
        path: ':board/:examId',
        loadComponent: () => import('./features/exam/exam-shell').then((m) => m.ExamShell),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'reading' },
          skillRoute('reading'),
          skillRoute('writing'),
          skillRoute('listening'),
          skillRoute('speaking'),
          skillRoute('mediation'),
          {
            path: 'results',
            loadComponent: () => import('./features/exam/results-page').then((m) => m.ResultsPage),
          },
        ],
      },
    ],
  },
  {
    path: 'settings',
    title: 'Settings | Learn English',
    loadComponent: () => import('./features/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: '**',
    title: 'Not found | Learn English',
    loadComponent: () => import('./features/not-found-page').then((m) => m.NotFoundPage),
  },
];
