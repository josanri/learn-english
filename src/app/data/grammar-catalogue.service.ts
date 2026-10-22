import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { IrregularVerbsFile, VerbFormsFile } from '../models/grammar';

/** Folder (relative to the base href) that contains the grammar JSON files. */
export const GRAMMAR_ROOT = 'assets/grammar';

/** Lazily loads the grammar data. Nothing is bundled: each file is fetched as static JSON on first use. */
@Injectable({ providedIn: 'root' })
export class GrammarCatalogueService {
  irregularVerbs() {
    return httpResource<IrregularVerbsFile>(() => `${GRAMMAR_ROOT}/irregular-verbs.json`);
  }

  verbForms() {
    return httpResource<VerbFormsFile>(() => `${GRAMMAR_ROOT}/verb-forms.json`);
  }
}
