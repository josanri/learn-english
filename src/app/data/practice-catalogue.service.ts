import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { FlashcardFile, PhrasalVerbsFile, Story, StoryIndex } from '../models/practice';

/** Folder (relative to the base href) with the graded reader stories. */
export const READER_ROOT = 'assets/reader';

/** Lazily loads the daily practice data (flashcards, phrasal verbs, stories) as static JSON. */
@Injectable({ providedIn: 'root' })
export class PracticeCatalogueService {
  flashcards() {
    return httpResource<FlashcardFile>(() => 'assets/vocabulary/flashcards.json');
  }

  phrasalVerbs() {
    return httpResource<PhrasalVerbsFile>(() => 'assets/vocabulary/phrasal-verbs.json');
  }

  storyIndex() {
    return httpResource<StoryIndex>(() => `${READER_ROOT}/index.json`);
  }

  /** One story; reloads when the id signal changes. */
  story(id: () => string) {
    return httpResource<Story>(() => `${READER_ROOT}/stories/${id()}.json`);
  }
}
