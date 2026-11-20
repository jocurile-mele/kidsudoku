import { useCallback, useEffect, useRef, useState } from "react";
import type { TargetSum } from "../game/puzzle";
import { soundEngine } from "../game/sound";
import { STAMPS, type StampDefinition, type StampId, type ThemeId } from "../game/stamps";
import {
  getTotalRewardCount,
  loadProgress,
  saveProgress,
  type PersistedProgress,
} from "../game/storage";

const THEME_META_COLORS: Record<ThemeId, string> = {
  "warm-paper": "#FBF7EF",
  "matcha-garden": "#F2F7F0",
  "cozy-dusk": "#1D222E",
};

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
    const loaded = loadProgress();
    soundEngine.setEnabled(loaded.soundEnabled);
    return loaded;
  });

  const [unlockedToast, setUnlockedToast] = useState<StampDefinition | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const rewardCount = getTotalRewardCount(progress);
  const hasUnseenReward = rewardCount > progress.seenRewardCount;
  const dailyCompletedToday = progress.dailyCompletedDates.includes(todayKey);

  useEffect(() => {
    saveProgress(progress);
    soundEngine.setEnabled(progress.soundEnabled);
    document.documentElement.setAttribute("data-theme", progress.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", THEME_META_COLORS[progress.theme]);
    }
  }, [progress]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showStampToast = useCallback((stamp: StampDefinition) => {
    setUnlockedToast(stamp);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setUnlockedToast(null);
      toastTimerRef.current = null;
    }, 4200);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setUnlockedToast(null);
  }, []);

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
