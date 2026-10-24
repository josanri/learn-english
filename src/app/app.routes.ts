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
    path: 'exams',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'b1' },
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
                loadComponent: () =>
                  import('./features/exam/results-page').then((m) => m.ResultsPage),
              },
            ],
          },
        ],
      },
    ],
  },
  // Old links without the `exams` prefix.
  { path: 'b1', pathMatch: 'full', redirectTo: 'exams/b1' },
  { path: 'b1/:board/:examId', pathMatch: 'full', redirectTo: 'exams/b1/:board/:examId' },
  {
    path: 'b1/:board/:examId/:section',
    pathMatch: 'full',
    redirectTo: 'exams/b1/:board/:examId/:section',
  },
  {
    path: 'grammar',
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Grammar | Learn English',
        loadComponent: () => import('./features/grammar/grammar-page').then((m) => m.GrammarPage),
      },
      {
        path: 'irregular-verbs',
        title: 'Irregular verbs | Learn English',
        loadComponent: () =>
          import('./features/grammar/irregular-verbs/irregular-verbs-page').then(
            (m) => m.IrregularVerbsPage,
          ),
      },
      {
        path: ':guide',
        title: 'Grammar guide | Learn English',
        loadComponent: () => import('./features/grammar/guide/guide-page').then((m) => m.GuidePage),
      },
    ],
  },
  {
    path: 'vocabulary',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'b1' },
      {
        path: 'b1',
        title: 'B1 vocabulary | Learn English',
        loadComponent: () =>
          import('./features/vocabulary/vocabulary-page').then((m) => m.VocabularyPage),
      },
      {
        path: 'flashcards',
        title: 'Flashcards | Learn English',
        loadComponent: () =>
          import('./features/flashcards/flashcards-page').then((m) => m.FlashcardsPage),
      },
      {
        path: 'phrasal-verbs',
        title: 'Phrasal verbs | Learn English',
        loadComponent: () =>
          import('./features/phrasal-verbs/phrasal-verbs-page').then((m) => m.PhrasalVerbsPage),
      },
    ],
  },
  {
    path: 'reader',
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Graded reader | Learn English',
        loadComponent: () => import('./features/reader/reader-page').then((m) => m.ReaderPage),
      },
      {
        path: ':story',
        title: 'Story | Learn English',
        loadComponent: () => import('./features/reader/story-page').then((m) => m.StoryPage),
      },
    ],
  },
  {
    path: 'practice/mistakes',
    title: 'My mistakes | Learn English',
    loadComponent: () => import('./features/mistakes/mistakes-page').then((m) => m.MistakesPage),
  },
  {
    path: 'settings',
    title: 'Settings | Learn English',
    loadComponent: () => import('./features/settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'credits',
    title: 'Image credits | Learn English',
    loadComponent: () => import('./features/credits/credits-page').then((m) => m.CreditsPage),
  },
  {
    path: '**',
    title: 'Not found | Learn English',
    loadComponent: () => import('./features/not-found-page').then((m) => m.NotFoundPage),
  },
];
