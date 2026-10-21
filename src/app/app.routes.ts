import type { Routes } from '@angular/router';

const titleOf = (skill: string) =>
  `${skill.charAt(0).toUpperCase()}${skill.slice(1)} | Learn English`;

/** Sections rendered by the exam engine (Reading, Writing, Listening, Speaking). */
const markedRoute = (skill: string) => ({
  path: skill,
  title: titleOf(skill),
  data: { skill },
  loadComponent: () => import('./features/exam/section-page').then((m) => m.SectionPage),
});

/** Mediation: navigation and a placeholder until its own phase. */
const placeholderRoute = (skill: string) => ({
  path: skill,
  title: titleOf(skill),
  data: { skill },
  loadComponent: () =>
    import('./features/exam/placeholder-section-page').then((m) => m.PlaceholderSectionPage),
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
          markedRoute('reading'),
          markedRoute('writing'),
          markedRoute('listening'),
          markedRoute('speaking'),
          placeholderRoute('mediation'),
          {
            path: 'results',
            title: 'Results | Learn English',
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
