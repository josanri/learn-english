import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { GuideFile, GuideIndex, IrregularVerbsFile } from '../models/grammar';

/** Folder (relative to the base href) that contains the grammar JSON files. */
export const GRAMMAR_ROOT = 'assets/grammar';

/** Lazily loads the grammar data. Nothing is bundled: each file is fetched as static JSON on first use. */
@Injectable({ providedIn: 'root' })
export class GrammarCatalogueService {
  irregularVerbs() {
    return httpResource<IrregularVerbsFile>(() => `${GRAMMAR_ROOT}/irregular-verbs.json`);
  }

  /** Ordered list of the guides (title, level and a one-line summary). */
  guideIndex() {
    return httpResource<GuideIndex>(() => `${GRAMMAR_ROOT}/guides/index.json`);
  }

  /** One guide; reloads when the id signal changes. */
  guide(id: () => string) {
    return httpResource<GuideFile>(() => `${GRAMMAR_ROOT}/guides/${id()}.json`);
  }
}
