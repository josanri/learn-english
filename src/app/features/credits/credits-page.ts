import { ChangeDetectionStrategy, Component, resource } from '@angular/core';
import { EXAMS_ROOT } from '../../data/exam-catalogue.service';
import type { Exam, ImageAsset, LevelIndex } from '../../models/exam';

interface CreditRow {
  examTitle: string;
  examId: string;
  title: string;
  image: ImageAsset;
}

/** Loads every exam of the given levels and lists all photographs with their credit. */
async function loadCredits(): Promise<CreditRow[]> {
  const rows: CreditRow[] = [];
  for (const level of ['b1']) {
    const index: LevelIndex = await (await fetch(`${EXAMS_ROOT}/${level}/index.json`)).json();
    const exams: Exam[] = await Promise.all(
      index.exams.map(async (e) => (await fetch(`${EXAMS_ROOT}/${e.path}`)).json()),
    );
    for (const exam of exams)
      for (const section of exam.sections)
        for (const part of section.parts)
          if ('images' in part)
            for (const visual of part.images)
              if (visual.image)
                rows.push({
                  examTitle: exam.title,
                  examId: exam.id,
                  title: visual.title,
                  image: visual.image,
                });
  }
  return rows;
}

/** Image credits: required by CC BY and CC BY-SA, and a courtesy for the other licences. */
@Component({
  selector: 'app-credits-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">About the pictures</p>
      <h1>Image credits</h1>
      <p class="lede">
        The photographs in the Speaking sections come from Wikimedia Commons and are reused under
        open licences (CC0, public domain, CC BY and CC BY-SA). Each picture is stored on this site;
        some were resized and cropped. Thank you to the photographers.
      </p>
      @if (credits.isLoading()) {
        <p role="status">Loading credits&hellip;</p>
      } @else if (credits.error()) {
        <p role="alert">The credits could not be loaded. Try again later.</p>
      } @else {
        <p class="muted">{{ credits.value()?.length }} pictures</p>
        <ul class="list">
          @for (row of credits.value(); track row.image.id) {
            <li>
              <img
                [src]="row.image.srcSmall ?? row.image.src"
                alt=""
                width="160"
                height="107"
                loading="lazy"
              />
              <div>
                <strong>{{ row.title }}</strong>
                <span class="muted">{{ row.examTitle }} ({{ row.examId }})</span>
                <span>
                  Photo by {{ row.image.credit.author }} &middot;
                  <a [href]="row.image.credit.licenseUrl" target="_blank" rel="noreferrer noopener"
                    >{{ row.image.credit.license
                    }}<span class="visually-hidden"> licence (opens in a new tab)</span></a
                  >
                  &middot;
                  <a [href]="row.image.credit.sourceUrl" target="_blank" rel="noreferrer noopener"
                    >Source<span class="visually-hidden">
                      for {{ row.title }} (opens in a new tab)</span
                    ></a
                  >
                </span>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .list {
      display: grid;
      gap: var(--space-4);
      margin: var(--space-5) 0 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: 7rem 1fr;
      gap: var(--space-4);
      align-items: start;
      padding: var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    li > div {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    img {
      width: 100%;
      height: auto;
      aspect-ratio: 3 / 2;
      object-fit: cover;
      border-radius: var(--radius);
    }
    a {
      color: var(--accent-text);
    }
  `,
})
export class CreditsPage {
  protected readonly credits = resource({ loader: () => loadCredits() });
}
