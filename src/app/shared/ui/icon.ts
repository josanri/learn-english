import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/** Paths of the inline icons (24x24 grid, stroked). Add new icons here; no icon library is used. */
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  settings:
    '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  book: '<path d="M3 5.5C5 4.5 8 4.5 12 6.5c4-2 7-2 9-1v13c-2-1-5-1-9 1-4-2-7-2-9-1z"/><path d="M12 6.5v13"/>',
  headphones:
    '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14 7l3 3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  chat: '<path d="M4 5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M20 9v8h-1v3l-3-3h-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><path d="M12 19.5v.5"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  repeat: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  volume:
    '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 6M20 4v7h-7"/>',
  // Exam topic groups (see data/exam-categories.ts).
  bird: '<path d="M16 7h.01"/><path d="M3.5 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.3-2.3L2 20"/><path d="M20 7l2 .5-2 .5"/><path d="M10 18v3M14 17.5V21"/>',
  mountains: '<path d="M2 20l6.5-10.5L13 16l3-4 6 8z"/><circle cx="17" cy="6" r="2"/>',
  leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l9-9"/>',
  palm: '<path d="M11 21c0-4.5.5-8.5 2-12"/><path d="M13 9c-2-2.5-6-3-8.5-.5M13 9c2-2.5 6-3 8.5-.5M13 9c-.5-3 1-5 4-6M13 9c-3-1-6.5.5-7.5 3.5"/><path d="M4 21h16"/>',
  plane:
    '<path d="M12 2c1 0 1.5 1 1.5 2.5V9l7.5 4.5V16l-7.5-2.5V18l2.5 2v1.5L12 20.5l-4 1V20l2.5-2v-4.5L3 16v-2.5L10.5 9V4.5C10.5 3 11 2 12 2z"/>',
  trophy:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3.5 4.5M16 6h3a3 3 0 0 1-3.5 4.5"/><path d="M12 13v5M8 21h8M10 18h4"/>',
  heartbeat:
    '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/><path d="M5 12h3l2-3 3 5.5 2-2.5h4"/>',
  chefhat:
    '<path d="M7 14a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 11 0 4 4 0 0 1-.5 8z"/><path d="M7 14v6h10v-6M7 17h10"/>',
  house:
    '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5M16 6.5V3.5h2.5v5"/>',
  people:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  gradcap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>',
  palette:
    '<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  clapper:
    '<path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10l-.6-3.5 15-2.6.6 3.5z"/><path d="M8.5 5.7l2 3.4M13.5 4.8l2 3.4"/>',
  robot:
    '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 8V5M2.5 12.5v3M21.5 12.5v3M9.5 16h5"/><circle cx="12" cy="3.5" r="1"/><circle cx="9" cy="12.5" r="1"/><circle cx="15" cy="12.5" r="1"/>',
  gamepad:
    '<path d="M7 7h10a5 5 0 0 1 4.8 6.3l-1 3.6a2.3 2.3 0 0 1-4 .8L15 16H9l-1.8 1.7a2.3 2.3 0 0 1-4-.8l-1-3.6A5 5 0 0 1 7 7z"/><path d="M7.5 10v3.5M5.75 11.75h3.5M15.5 11h.01M18 13h.01"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 10.5V6a3 3 0 0 1 6 0v4.5"/>',
  columns: '<path d="M3 9l9-5 9 5z"/><path d="M5.5 9v9M10 9v9M14 9v9M18.5 9v9M3 21h18M4 18h16"/>',
  shapes:
    '<path d="M12 2.5l4.5 7.5h-9z"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1"/><circle cx="17.25" cy="17.25" r="3.75"/>',
} as const;

export type IconName = keyof typeof ICONS;

/** Inline SVG icon. Decorative (aria-hidden): put the accessible name on the parent control. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<svg
    [attr.width]="size()"
    [attr.height]="size()"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    focusable="false"
    [innerHTML]="markup()"
  ></svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      line-height: 0;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  /** Size in px. */
  readonly size = input(20);
  private readonly sanitizer = inject(DomSanitizer);
  // The markup comes from the constant table above, never from user input, so it is safe to trust.
  protected readonly markup = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()]),
  );
}
