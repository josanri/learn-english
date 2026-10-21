import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { AudioDbService, recordingKey } from '../../../core/audio-db.service';
import { SettingsService } from '../../../core/settings.service';
import { LocalStorageService } from '../../../core/storage.service';
import type { Exam, Part, SpeakingPart } from '../../../models/exam';
import type { AttemptData } from '../../../models/storage';
import { partPrompts } from '../parts/part-registry';
import { loadThumbnail } from './export-images';
import type { ReportInput, ReportOptions } from './report-model';

/** The attempt to export: the current one or an archived one. */
export interface ExportTarget {
  exam: Exam;
  /** Storage id of the attempt (`<examId>-<n>`) used to find its recordings. */
  attemptId: string;
  attemptNumber: number;
  label: string;
  current: boolean;
  data: AttemptData;
  date: string;
}

export function safeFileName(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'exam'
  );
}

/**
 * Downloads the PDF report or the ZIP of an attempt. pdfmake, fflate, the PDF fonts and the writing
 * rules are imported dynamically, so none of them is part of the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class ResultExportService {
  private readonly document = inject(DOCUMENT);
  private readonly settings = inject(SettingsService);
  private readonly storage = inject(LocalStorageService);
  private readonly audio = inject(AudioDbService);

  async downloadPdf(target: ExportTarget, options: ReportOptions): Promise<void> {
    const { input } = await this.prepare(target, options.mode === 'full');
    const { renderPdf } = await import('./pdf-render');
    const { blob } = await renderPdf(input, options, this.document.baseURI);
    const kind = options.mode === 'full' ? 'report' : 'answer-sheet';
    this.save(blob, `${this.baseName(target)}-${kind}.pdf`);
  }

  async downloadZip(target: ExportTarget): Promise<void> {
    const { input, recordings } = await this.prepare(target, true);
    const [{ renderPdf }, { buildZip }] = await Promise.all([
      import('./pdf-render'),
      import('./zip-export'),
    ]);
    const { blob, model } = await renderPdf(
      input,
      { mode: 'full', includeSources: false },
      this.document.baseURI,
    );
    const zip = await buildZip(target.exam, model, blob, recordings);
    this.save(zip, `${this.baseName(target)}.zip`);
  }

  private baseName(target: ExportTarget): string {
    return `${safeFileName(target.exam.title)}-attempt-${target.attemptNumber}`;
  }

  /** Reads what the report needs from the device: recordings (IndexedDB) and speaking pictures. */
  private async prepare(target: ExportTarget, withPictures: boolean) {
    const { exam } = target;
    const speaking = exam.sections.find((s) => s.skill === 'speaking');
    const parts = (speaking?.parts ?? []) as SpeakingPart[];
    const recordings: { promptId: string; partId: string; blob: Blob }[] = [];
    for (const part of parts) {
      for (const prompt of partPrompts(part as Part)) {
        try {
          const blob = await this.audio.load(recordingKey(exam.id, target.attemptId, prompt.id));
          if (blob) recordings.push({ promptId: prompt.id, partId: part.id, blob });
        } catch {
          /* A recording that cannot be read does not stop the export. */
        }
      }
    }
    const images: Record<string, string | null> = {};
    if (withPictures) {
      const visuals = parts.flatMap((p) => ('images' in p ? p.images : []));
      await Promise.all(
        visuals.map(async (v) => {
          images[v.id] = v.image ? await loadThumbnail(v.image.src, this.document.baseURI) : null;
        }),
      );
    }
    const session = target.current ? (this.storage.progress()[exam.id]?.session ?? null) : null;
    const input: Omit<ReportInput, 'issuesFor'> = {
      exam,
      attemptLabel: target.label,
      attemptNumber: target.attemptNumber,
      attemptId: target.attemptId,
      current: target.current,
      data: target.data,
      date: target.date,
      studentName: this.settings.settings().studentName,
      session,
      recordings: new Set(recordings.map((r) => r.promptId)),
      images,
      exportedAt: new Date(),
    };
    return { input, recordings };
  }

  private save(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = name;
    link.rel = 'noopener';
    this.document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
