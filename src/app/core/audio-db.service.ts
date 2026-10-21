import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { upgradeLegacyAudioKey } from './state-migrations';
import { LocalStorageService } from './storage.service';

export const AUDIO_DATABASE = 'learn-english-audio';
export const AUDIO_STORE = 'clips';
/** Database and store used by the React app. They are copied, never modified or deleted. */
export const LEGACY_AUDIO_DATABASE = 'northstar-speech-recordings';
export const LEGACY_AUDIO_STORE = 'clips';

function request<T>(req: IDBRequest<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error(message));
  });
}

/** IndexedDB storage for speaking recordings (one Blob per prompt, keyed `<examId>:<promptId>`). */
@Injectable({ providedIn: 'root' })
export class AudioDbService {
  private readonly idb = inject(DOCUMENT).defaultView?.indexedDB;
  private readonly store = inject(LocalStorageService);

  async save(key: string, blob: Blob): Promise<void> {
    const db = await this.open(AUDIO_DATABASE, AUDIO_STORE);
    try {
      await request(
        db.transaction(AUDIO_STORE, 'readwrite').objectStore(AUDIO_STORE).put(blob, key),
        'Could not save this recording.',
      );
    } finally {
      db.close();
    }
  }

  async load(key: string): Promise<Blob | null> {
    const db = await this.open(AUDIO_DATABASE, AUDIO_STORE);
    try {
      const value = await request<Blob | undefined>(
        db.transaction(AUDIO_STORE, 'readonly').objectStore(AUDIO_STORE).get(key),
        'Could not load this recording.',
      );
      return value ?? null;
    } finally {
      db.close();
    }
  }

  async delete(key: string): Promise<void> {
    const db = await this.open(AUDIO_DATABASE, AUDIO_STORE);
    try {
      await request(
        db.transaction(AUDIO_STORE, 'readwrite').objectStore(AUDIO_STORE).delete(key),
        'Could not delete this recording.',
      );
    } finally {
      db.close();
    }
  }

  /**
   * Copies recordings from the React app database into the new one (renaming `exam-0N:` keys to
   * `cambridge-pet-0N:`). Runs once; the old database is left in place as a backup.
   * Returns how many clips were copied.
   */
  async migrateLegacyRecordings(): Promise<number> {
    if (!this.idb || this.store.state().migrations.audioDb) return 0;
    let copied = 0;
    try {
      const legacy = await this.openExisting(LEGACY_AUDIO_DATABASE, LEGACY_AUDIO_STORE);
      if (legacy) {
        try {
          const source = legacy
            .transaction(LEGACY_AUDIO_STORE, 'readonly')
            .objectStore(LEGACY_AUDIO_STORE);
          const [keys, values] = await Promise.all([
            request(source.getAllKeys(), 'Could not read old recordings.'),
            request(source.getAll(), 'Could not read old recordings.'),
          ]);
          const target = await this.open(AUDIO_DATABASE, AUDIO_STORE);
          try {
            const write = target.transaction(AUDIO_STORE, 'readwrite');
            const out = write.objectStore(AUDIO_STORE);
            keys.forEach((key, i) => {
              out.put(values[i], upgradeLegacyAudioKey(String(key)));
              copied += 1;
            });
            await new Promise<void>((resolve, reject) => {
              write.oncomplete = () => resolve();
              write.onerror = () =>
                reject(write.error ?? new Error('Could not copy old recordings.'));
            });
          } finally {
            target.close();
          }
        } finally {
          legacy.close();
        }
      }
      this.store.markMigration('audioDb', new Date().toISOString());
    } catch {
      /* Leave the flag unset so the migration is retried next time. */
    }
    return copied;
  }

  private open(name: string, storeName: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!this.idb) return reject(new Error('Audio storage is not available in this browser.'));
      const req = this.idb.open(name, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(storeName))
          req.result.createObjectStore(storeName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Could not open local audio storage.'));
    });
  }

  /** Opens a database only if it already exists with the store; never creates the legacy database. */
  private openExisting(name: string, storeName: string): Promise<IDBDatabase | null> {
    return new Promise((resolve, reject) => {
      if (!this.idb) return resolve(null);
      let created = false;
      const req = this.idb.open(name);
      req.onupgradeneeded = () => {
        created = true; // The database did not exist; abort so that nothing is created.
        req.transaction?.abort();
      };
      req.onsuccess = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(storeName)) return resolve(db);
        db.close();
        resolve(null);
      };
      req.onerror = () =>
        created ? resolve(null) : reject(req.error ?? new Error('Could not open old recordings.'));
    });
  }
}
