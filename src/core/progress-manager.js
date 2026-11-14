import { createInitialGameState, normalizeGameState, getTotalCompletedStages } from './game-state.js';
import { WORLDS } from '../data/worlds.js';

const STORAGE_KEY = 'treasure_adventure_two_worlds_v1';

export class ProgressManager {
  constructor(storage = typeof window !== 'undefined' ? window.localStorage : null) {
    this.storage = storage;
  }

  load() {
    if (!this.storage) return createInitialGameState();
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return createInitialGameState();
      return normalizeGameState(JSON.parse(raw));
    } catch {
      return createInitialGameState();
    }
  }

  save(state) {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(normalizeGameState(state)));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }

  hasSavedProgress() {
    const state = this.load();
    const anyWorldProgress = WORLDS.some((w) => {
      const ws = state.worlds?.[w.id];
      return Boolean(
        ws?.introSeen ||
          getTotalCompletedStages(state, w.id) > 0 ||
          ws?.keys?.magnetic ||
          ws?.keys?.silver ||
          ws?.finalCompleted
      );
    });
    return Boolean(state.hasStarted || anyWorldProgress);
  }

  reset() {
    const fresh = createInitialGameState();
    if (this.storage) {
      try {
        this.storage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    return fresh;
  }
}
