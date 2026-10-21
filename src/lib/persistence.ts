import { AUDIO_DATABASE, AUDIO_STORE, STORAGE_KEY } from '../constants/app';

export type SavedExamData = {
  answers: Record<string, Record<string, string | number>>;
  results: Record<string, { correct: number; total: number; completedAt: string }>;
};

export const EMPTY_SAVED_DATA: SavedExamData = { answers: {}, results: {} };

export function readSavedData(): SavedExamData {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<SavedExamData>;
    return { ...EMPTY_SAVED_DATA, ...saved };
  } catch {
    return EMPTY_SAVED_DATA;
  }
}

export function writeSavedData(data: SavedExamData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { /* Keep the active practice session usable if local storage is unavailable. */ }
}

function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Audio storage is not available in this browser.'));
    const request = indexedDB.open(AUDIO_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(AUDIO_STORE)) request.result.createObjectStore(AUDIO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local audio storage.'));
  });
}

export async function saveAudioClip(id: string, blob: Blob): Promise<void> {
  const database = await openAudioDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(AUDIO_STORE, 'readwrite').objectStore(AUDIO_STORE).put(blob, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not save this recording.'));
  });
  database.close();
}

export async function loadAudioClip(id: string): Promise<Blob | null> {
  const database = await openAudioDatabase();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const request = database.transaction(AUDIO_STORE, 'readonly').objectStore(AUDIO_STORE).get(id);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not load this recording.'));
  });
  database.close();
  return blob;
}

export async function deleteAudioClip(id: string): Promise<void> {
  const database = await openAudioDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(AUDIO_STORE, 'readwrite').objectStore(AUDIO_STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not delete this recording.'));
  });
  database.close();
}
