import type { TargetSum } from "./puzzle";
import { STAMPS, THEMES, type StampId, type ThemeId } from "./stamps";

export interface PersistedProgress {
  totalSolved: number;
  bestStreak: number;
  setsCompleted: number;
  sudoku4x4Solved: number;
  soundEnabled: boolean;
  pipsEnabled: boolean;
  targetSum: TargetSum;
  theme: ThemeId;
  pinnedStampId: StampId | null;
  dailyCompletedDates: string[];
  seenRewardCount: number;
}

const STORAGE_KEY = "kidsudoku-make10-progress-v1";

const DEFAULT_PROGRESS: PersistedProgress = {
  totalSolved: 0,
  bestStreak: 0,
  setsCompleted: 0,
  sudoku4x4Solved: 0,
  soundEnabled: true,
  pipsEnabled: false,
  targetSum: 10,
  theme: "warm-paper",
  pinnedStampId: null,
  dailyCompletedDates: [],
  seenRewardCount: 0,
};

const VALID_THEMES = new Set<string>(THEMES.map((t) => t.id));
const VALID_STAMPS = new Set<string>(STAMPS.map((s) => s.id));
const VALID_TARGET_SUMS = new Set<number>([5, 10, 20]);

export function getTotalRewardCount(progress: PersistedProgress): number {
  return progress.setsCompleted + progress.dailyCompletedDates.length + progress.sudoku4x4Solved;
}

export function loadProgress(): PersistedProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    return {
      totalSolved:
        typeof parsed.totalSolved === "number" && parsed.totalSolved >= 0
          ? Math.floor(parsed.totalSolved)
          : 0,
      bestStreak:
        typeof parsed.bestStreak === "number" && parsed.bestStreak >= 0
          ? Math.floor(parsed.bestStreak)
          : 0,
      setsCompleted:
        typeof parsed.setsCompleted === "number" && parsed.setsCompleted >= 0
          ? Math.floor(parsed.setsCompleted)
          : 0,
      sudoku4x4Solved:
        typeof parsed.sudoku4x4Solved === "number" && parsed.sudoku4x4Solved >= 0
          ? Math.floor(parsed.sudoku4x4Solved)
          : 0,
      soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : true,
      pipsEnabled: typeof parsed.pipsEnabled === "boolean" ? parsed.pipsEnabled : false,
      targetSum:
        typeof parsed.targetSum === "number" && VALID_TARGET_SUMS.has(parsed.targetSum)
          ? (parsed.targetSum as TargetSum)
          : 10,
      theme:
        typeof parsed.theme === "string" && VALID_THEMES.has(parsed.theme)
          ? (parsed.theme as ThemeId)
          : "warm-paper",
      pinnedStampId:
        typeof parsed.pinnedStampId === "string" && VALID_STAMPS.has(parsed.pinnedStampId)
          ? (parsed.pinnedStampId as StampId)
          : null,
      dailyCompletedDates: Array.isArray(parsed.dailyCompletedDates)
        ? parsed.dailyCompletedDates.filter((d): d is string => typeof d === "string").slice(-60)
        : [],
      seenRewardCount:
        typeof parsed.seenRewardCount === "number" && parsed.seenRewardCount >= 0
          ? Math.floor(parsed.seenRewardCount)
          : 0,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: PersistedProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota or privacy-mode errors gracefully
  }
}
