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

`FoldPosture` (`src/app/core/fold-posture.service.ts`) reads `(device-posture: folded)` together with `(horizontal-viewport-segments: 2)` or `(vertical-viewport-segments: 2)` and sets `data-fold="book"` (fold vertical, two segments side by side) or `data-fold="laptop"` (fold horizontal, two segments stacked) on `<html>`. The attribute is absent when the screen is flat, closed or the browser lacks the features, so width-based layouts stay the base. The signals `layout()` and `folded()` are there for code that needs them.

Components react in their own styles with `:host-context(html[data-fold])` (see `SplitLayout` in `features/exam/ui/layout.ts` and `StoryPage`): passage on one side of the fold, questions on the other, no tab switch. The fold is assumed to sit near the middle, as on iPhone Duo. Safari 27.1 on iPhone Duo has both APIs behind feature flags (Settings > Apps > Safari > Advanced > Feature Flags), so test on a device or Xcode's Device Hub simulator with them on.

## Accessibility check

Run `ng serve` and axe through `@axe-core/playwright` (dev dependency; system Chrome works with `channel: 'chrome'`). Home, /exams/b1 and /settings had no violations in either theme at 360 and 1280 px.
