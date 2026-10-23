// Shared helpers for the exam scripts: locating exam files and building the per-level index.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const examsRoot = fileURLToPath(new URL('../../src/assets/exams/', import.meta.url));

/** Human-readable board names shown in listings. Add a row here when a new board is introduced. */
export const BOARD_INFO = {
  'cambridge-pet': {
    name: 'Cambridge B1 Preliminary (PET)',
    description: 'Original practice papers in the style of the Cambridge B1 Preliminary exam.',
  },
  eoi: {
    name: 'EOI B1 (Spain)',
    description:
      'Practice papers in the style of the Escuelas Oficiales de Idiomas B1 certificate.',
  },
  'trinity-ise1': {
    name: 'Trinity ISE I',
    description: 'Practice tasks in the style of Trinity College London ISE I (B1).',
  },
  'aptis-b1': {
    name: 'Aptis B1',
    description: 'Practice tasks in the style of the British Council Aptis test at B1.',
  },
  'languagecert-b1': {
    name: 'LanguageCert B1',
    description: 'Practice papers in the style of LanguageCert International ESOL B1.',
  },
  'oxford-test-b1': {
    name: 'Oxford Test of English (B1)',
    description: 'Practice tasks in the style of the Oxford Test of English at B1.',
  },
};

/** Returns [{ level, board, file, path }] for every exam JSON (index.json files are skipped). */
export function listExamFiles() {
  const found = [];
  for (const level of readdirSync(examsRoot)) {
    const levelDir = join(examsRoot, level);
    if (!statSync(levelDir).isDirectory()) continue;
    for (const board of readdirSync(levelDir)) {
      const boardDir = join(levelDir, board);
      if (!statSync(boardDir).isDirectory()) continue;
      for (const file of readdirSync(boardDir)
        .filter((n) => n.endsWith('.json'))
        .sort()) {
        found.push({
          level,
          board,
          file,
          path: `${level}/${board}/${file}`,
          absolute: join(boardDir, file),
        });
      }
    }
  }
  return found;
}

export function readExam(entry) {
  return JSON.parse(readFileSync(entry.absolute, 'utf8'));
}

/** Builds the index for one level directory name (for example `b1`). */
export function buildLevelIndex(levelDir) {
  const entries = listExamFiles().filter((e) => e.level === levelDir);
  const exams = entries.map((entry) => {
    const exam = readExam(entry);
    return {
      id: exam.id,
      level: exam.level,
      board: exam.board,
      title: exam.title,
      subtitle: exam.subtitle,
      theme: exam.theme,
      category: exam.category,
      estimatedMinutes: exam.estimatedMinutes,
      skills: exam.sections.map((s) => s.skill),
      path: entry.path,
    };
  });
  const boards = [...new Set(exams.map((e) => e.board))].map((id) => ({
    id,
    name: BOARD_INFO[id]?.name ?? id,
    description: BOARD_INFO[id]?.description ?? '',
  }));
  return { schemaVersion: 2, level: levelDir.toUpperCase(), boards, exams };
}

export function levelDirs() {
  return readdirSync(examsRoot).filter((n) => statSync(join(examsRoot, n)).isDirectory());
}
