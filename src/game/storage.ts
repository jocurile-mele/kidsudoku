export interface PersistedProgress {
  totalSolved: number;
  bestStreak: number;
  setsCompleted: number;
  soundEnabled: boolean;
}

const STORAGE_KEY = 'kidsudoku-make10-progress-v1';

const DEFAULT_PROGRESS: PersistedProgress = {
  totalSolved: 0,
  bestStreak: 0,
  setsCompleted: 0,
  soundEnabled: true,
};

export function loadProgress(): PersistedProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    return {
      totalSolved:
        typeof parsed.totalSolved === 'number' && parsed.totalSolved >= 0
          ? Math.floor(parsed.totalSolved)
          : 0,
      bestStreak:
        typeof parsed.bestStreak === 'number' && parsed.bestStreak >= 0
          ? Math.floor(parsed.bestStreak)
          : 0,
      setsCompleted:
        typeof parsed.setsCompleted === 'number' && parsed.setsCompleted >= 0
          ? Math.floor(parsed.setsCompleted)
          : 0,
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: PersistedProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota or privacy-mode errors gracefully
  }
}
