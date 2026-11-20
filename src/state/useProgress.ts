import { useCallback, useEffect, useState } from "react";
import type { TargetSum } from "../game/puzzle";
import { STAMPS, THEMES, type StampDefinition, type StampId, type ThemeId } from "../game/stamps";
import { soundEngine } from "../platform/sound";
import { readJsonStorage, writeJsonStorage } from "../platform/storage";
import { useManagedTimers } from "../platform/timers";

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

const THEME_META_COLORS: Record<ThemeId, string> = {
  "warm-paper": "#FBF7EF",
  "matcha-garden": "#F2F7F0",
  "cozy-dusk": "#1D222E",
};

export function getTotalRewardCount(progress: PersistedProgress): number {
  return progress.setsCompleted + progress.dailyCompletedDates.length + progress.sudoku4x4Solved;
}

function parsePersistedProgress(raw: unknown): PersistedProgress {
  if (!raw || typeof raw !== "object") return DEFAULT_PROGRESS;
  const parsed = raw as Partial<PersistedProgress>;
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
}

export interface SolveRecordInput {
  kind: "2x2" | "daily" | "sudoku-4x4";
  nextStreak: number;
  completedSet?: boolean;
  dailyDateKey?: string;
}

export interface SolveApplyResult {
  nextProgress: PersistedProgress;
  newlyUnlockedStamp: StampDefinition | null;
}

/**
 * Pure durable-state transition for recording any mode solve and computing
 * whether a new woodblock stamp crossed its unlock threshold.
 */
export function applySolveToProgress(
  prev: PersistedProgress,
  input: SolveRecordInput,
): SolveApplyResult {
  const prevRewards = getTotalRewardCount(prev);
  const nextDailyDates =
    input.kind === "daily" &&
    input.dailyDateKey &&
    !prev.dailyCompletedDates.includes(input.dailyDateKey)
      ? [...prev.dailyCompletedDates, input.dailyDateKey]
      : prev.dailyCompletedDates;

  const nextProgress: PersistedProgress = {
    ...prev,
    totalSolved: prev.totalSolved + 1,
    bestStreak: Math.max(prev.bestStreak, input.nextStreak),
    setsCompleted: input.completedSet ? prev.setsCompleted + 1 : prev.setsCompleted,
    sudoku4x4Solved: input.kind === "sudoku-4x4" ? prev.sudoku4x4Solved + 1 : prev.sudoku4x4Solved,
    dailyCompletedDates: nextDailyDates,
  };

  const nextRewards = getTotalRewardCount(nextProgress);
  const newlyUnlockedStamp =
    nextRewards > prevRewards
      ? (STAMPS.find((s) => s.requiredRewards > prevRewards && s.requiredRewards <= nextRewards) ??
        null)
      : null;

  return { nextProgress, newlyUnlockedStamp };
}

export interface ProgressStore {
  progress: PersistedProgress;
  rewardCount: number;
  hasUnseenReward: boolean;
  dailyCompletedToday: boolean;
  unlockedToast: StampDefinition | null;
  recordSolve: (input: SolveRecordInput) => void;
  setTargetSum: (target: TargetSum) => void;
  setTheme: (theme: ThemeId) => void;
  pinStamp: (stampId: StampId | null) => void;
  toggleSound: (onMuted?: () => void) => void;
  togglePips: () => void;
  markRewardsSeen: () => void;
  dismissToast: () => void;
}

/**
 * Single writer for durable KidSudoku progress, theme syncing, sound preference,
 * and automatic stamp-unlock notifications.
 */
export function useProgress(todayKey: string): ProgressStore {
  const [progress, setProgress] = useState<PersistedProgress>(() => {
    const loaded = readJsonStorage(STORAGE_KEY, DEFAULT_PROGRESS, parsePersistedProgress);
    soundEngine.setEnabled(loaded.soundEnabled);
    return loaded;
  });

  const [unlockedToast, setUnlockedToast] = useState<StampDefinition | null>(null);
  const timers = useManagedTimers();

  const rewardCount = getTotalRewardCount(progress);
  const hasUnseenReward = rewardCount > progress.seenRewardCount;
  const dailyCompletedToday = progress.dailyCompletedDates.includes(todayKey);

  useEffect(() => {
    writeJsonStorage(STORAGE_KEY, progress);
    soundEngine.setEnabled(progress.soundEnabled);
    document.documentElement.setAttribute("data-theme", progress.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", THEME_META_COLORS[progress.theme]);
    }
  }, [progress]);

  const showStampToast = useCallback(
    (stamp: StampDefinition) => {
      setUnlockedToast(stamp);
      timers.schedule("stamp-toast", () => setUnlockedToast(null), 4200);
    },
    [timers],
  );

  const dismissToast = useCallback(() => {
    timers.cancel("stamp-toast");
    setUnlockedToast(null);
  }, [timers]);

  const recordSolve = useCallback(
    (input: SolveRecordInput) => {
      setProgress((prev) => {
        const { nextProgress, newlyUnlockedStamp } = applySolveToProgress(prev, input);
        if (newlyUnlockedStamp) {
          showStampToast(newlyUnlockedStamp);
        }
        return nextProgress;
      });
    },
    [showStampToast],
  );

  const setTargetSum = useCallback((target: TargetSum) => {
    setProgress((prev) => (prev.targetSum === target ? prev : { ...prev, targetSum: target }));
  }, []);

  const setTheme = useCallback((theme: ThemeId) => {
    setProgress((prev) => ({ ...prev, theme }));
  }, []);

  const pinStamp = useCallback((stampId: StampId | null) => {
    setProgress((prev) => ({ ...prev, pinnedStampId: stampId }));
  }, []);

  const toggleSound = useCallback((onMuted?: () => void) => {
    setProgress((prev) => {
      const nextEnabled = !prev.soundEnabled;
      soundEngine.setEnabled(nextEnabled);
      if (nextEnabled) {
        soundEngine.playTap();
      } else {
        onMuted?.();
      }
      return { ...prev, soundEnabled: nextEnabled };
    });
  }, []);

  const togglePips = useCallback(() => {
    setProgress((prev) => ({ ...prev, pipsEnabled: !prev.pipsEnabled }));
  }, []);

  const markRewardsSeen = useCallback(() => {
    dismissToast();
    setProgress((prev) => ({
      ...prev,
      seenRewardCount: getTotalRewardCount(prev),
    }));
  }, [dismissToast]);

  return {
    progress,
    rewardCount,
    hasUnseenReward,
    dailyCompletedToday,
    unlockedToast,
    recordSolve,
    setTargetSum,
    setTheme,
    pinStamp,
    toggleSound,
    togglePips,
    markRewardsSeen,
    dismissToast,
  };
}
