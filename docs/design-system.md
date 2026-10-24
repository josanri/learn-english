# Design system

Own take on a bold, tactile look: huge tight headlines, flat colour cards with thick borders and solid offset shadows, key-like buttons. Fonts are bundled (Bricolage Grotesque Variable for display and body, JetBrains Mono Variable for chips, timers and counters) and imported in `src/styles.css`.

## Tokens

`src/styles/tokens.css` (CSS custom properties): colour (`--bg --surface --surface-2 --text --text-muted --border --border-muted --accent --accent-strong --on-accent --accent-text --success --warning --danger --focus-ring`), `--paper-*` card colours, `--radius-*`, `--space-1..9`, `--step--1..6` fluid type, `--font-display/body/mono`, `--target` (44 px minimum touch size), `--dur` (motion, 0s when reduced).

- Never hard-code colours or px sizes. Use rem and tokens.
- Brand blue `--accent` is for graphics only. Text uses `--accent-text`, buttons `--accent-strong` + `--on-accent`.
- Themes: light in `:root`, dark in `:root[data-theme='dark']` and an identical copy in `@media (prefers-color-scheme: dark) :root:not([data-theme])`. Other settings set `data-text-size`, `data-motion='reduce'` and `data-contrast='high'` on `<html>`. `ThemeService` applies them and an inline script in `index.html` does it before first paint.
- If you add or change a token, edit both dark copies and run `npm run check:contrast` (WCAG 2.2 AA table for every pair; add new pairs in `scripts/check-contrast.mjs`).

## Utilities (`src/styles/base.css`)

`.container`, `.page`, `.eyebrow`, `.lede`, `.muted`, `.section-title`, `.visually-hidden`, `.field`, `.hint`, `.switch` (the checkbox toggle markup is documented in the file).

## Components (`src/app/shared/ui`, barrel `index.ts`)

- `appButton` on a native `<button>` or `<a>`: variant primary|secondary|ghost|danger, size sm|md|lg, block.
- `app-chip` (`[command]` for mono chips with a `$` prompt; pass `[prompt]="false"` for durations, timers and counters), `app-card` (`[raised]`), `app-illustrated-card` (heading, tone, rotate, link; project `<app-skill-art art kind="reading">`), `app-badge` (tone).
- `app-progress-ring` / `app-progress-bar` (value 0..1, label), `app-segmented-control` (native radios, `[(value)]`, options, label).
- `app-dialog` (`[(open)]`, heading, buttons in `<ng-container actions>`; native `<dialog>`), `ToastService.show()` (host `app-toast-host` is in the shell).
- `app-skip-link`, `app-icon` (names in `icon.ts`), `app-empty-state`, `app-logo-mark`, `app-skill-art`.

Use these instead of ad-hoc markup.

## Brand

Logo = closing quotation marks on a paper-blue key tile (`app-logo-mark`, same drawing in `public/favicon.svg`). After a change run `npm run icons:generate` for `favicon.ico` and the PWA icons. The home hero is "Learn" plus "English" in a tilted speech bubble (paper blue, card border and offset shadow). Keep the bubble for the hero only, not for the logo.

## Settings

`Settings` in `models/storage.ts`; defaults and validation in `core/state-migrations.ts`; access through `SettingsService.update()`. Fields: theme, textSize, reduceMotion, highContrast, voiceUri, speechRate (0.8 to 1.2), recognitionLang, onlineRecognition, showTimer, examMode, studentName, spellingLang, nativeSpellcheck, languageTool.

Exam pages must honour `showTimer`, `examMode` (no hints or explanations until finished) and `recognitionLang` / `onlineRecognition`.

## Foldable phones

`FoldPosture` (`src/app/core/fold-posture.service.ts`) reads `(horizontal-viewport-segments: 2)` and `(vertical-viewport-segments: 2)` and sets `data-fold="book"` (fold or hinge vertical, two segments side by side) or `data-fold="laptop"` (horizontal, two segments stacked) on `<html>`. The browser reports two segments only when a fold or a hinge crosses the viewport, so the posture is not checked: a Surface Duo lying flat (posture `continuous`) still has its hinge and gets `book`. The attribute is absent on a single screen or when the browser lacks the features, so width-based layouts stay the base. The signals `layout()` and `folded()` are there for code that needs them.

The two screens are used like the two pages of a book. The page stays on the first screen (left in `book`, top in `laptop`) and scrolls; a fixed panel fills the second screen and scrolls on its own. The rules are global, in `src/styles/base.css`:

- `fold-panel`: the questions of an exam part (`SplitLayout`, or the whole `PartView` of a Reading or Listening part with no passage), the recorders of a Speaking part (the prompt, photos, options or topics stay in the page; `QuestionSequence` takes `panel` so that only the Questions part uses it) and the questions of a story. Used in `book` (right screen) and `laptop` (bottom screen, from `--fold-top-2`; the body gets a bottom padding of the same height and the site header is not sticky).
- `fold-side`: the secondary content of the other pages, in `book` only, because the top screen of `laptop` is too short: the Home cards, the exam list filters, the Grammar trainer cards, the guide contents, the Writing help (suggestions, checklist, rubric), the practice of irregular and phrasal verbs (shown beside the list, with no switch), the flashcard, the vocabulary filters, the reader library, the second half of the Settings cards and the Results attempts and export.

A panel that contains another panel stays in the page. In `book`, `.container` is limited to `--fold-seg-1`, the site header keeps the brand and the theme button on the left screen and puts the links at the top of the right screen, and the `--step-*` type scale grows with one screen (`--fold-vw`) instead of the viewport. Media queries still see the full width of both screens, so rules that must follow one screen use a container query (the exam header, the irregular verbs table, the tense timeline) or repeat the phone rule under `:host-context(html[data-fold='book'])` (the part tabs, the flashcard grades).

To test in Chrome, emulate the fold with `Emulation.setDeviceMetricsOverride` and its `displayFeature` and `devicePosture` fields (DevTools has Surface Duo and Galaxy Z Fold presets), and take screenshots with `Page.captureScreenshot`: Playwright's own screenshot resets the device metrics. Safari 27.1 on iPhone Duo has both APIs behind feature flags (Settings > Apps > Safari > Advanced > Feature Flags), so test on a device or Xcode's Device Hub simulator with them on.

## Accessibility check

Run `ng serve` and axe through `@axe-core/playwright` (dev dependency; system Chrome works with `channel: 'chrome'`). Home, /exams/b1 and /settings had no violations in either theme at 360 and 1280 px.
