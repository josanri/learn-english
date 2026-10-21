import { Injectable, computed, inject, signal } from '@angular/core';
import { ExamCatalogueService } from '../../data/exam-catalogue.service';

/** Holds the exam currently open. Provided by the exam shell so section pages can read it. */
@Injectable()
export class ExamContext {
  private readonly catalogue = inject(ExamCatalogueService);

  readonly location = signal<{ level: string; board: string; examId: string } | undefined>(
    undefined,
  );
  readonly resource = this.catalogue.exam(() => this.location());
  readonly exam = computed(() => (this.resource.hasValue() ? this.resource.value() : undefined));
}
