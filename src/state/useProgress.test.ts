import { describe, expect, it } from "vite-plus/test";
import type { PersistedProgress } from "../game/storage";
import { applySolveToProgress } from "./useProgress";

function baseProgress(overrides: Partial<PersistedProgress> = {}): PersistedProgress {
  return {
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
    ...overrides,
  };
}

describe("applySolveToProgress (single durable writer)", () => {
  it("increments totalSolved and bestStreak on a regular 2x2 solve without unlocking a stamp", () => {
    const { nextProgress, newlyUnlockedStamp } = applySolveToProgress(
      baseProgress({ totalSolved: 2, bestStreak: 2 }),
      { kind: "2x2", nextStreak: 3, completedSet: false },
    );

    expect(nextProgress.totalSolved).toBe(3);
    expect(nextProgress.bestStreak).toBe(3);
    expect(nextProgress.setsCompleted).toBe(0);
    expect(newlyUnlockedStamp).toBeNull();
  });

  it("unlocks the first stamp when completing the first 5-star set", () => {
    const { nextProgress, newlyUnlockedStamp } = applySolveToProgress(baseProgress(), {
      kind: "2x2",
      nextStreak: 5,
      completedSet: true,
    });

    expect(nextProgress.setsCompleted).toBe(1);
    expect(newlyUnlockedStamp).not.toBeNull();
    expect(newlyUnlockedStamp?.requiredRewards).toBe(1);
  });

  it("deduplicates dailyCompletedDates for the same day", () => {
    const first = applySolveToProgress(baseProgress(), {
      kind: "daily",
      nextStreak: 5,
      dailyDateKey: "2026-11-20",
    });
    expect(first.nextProgress.dailyCompletedDates).toEqual(["2026-11-20"]);
    expect(first.newlyUnlockedStamp).not.toBeNull();

    const repeat = applySolveToProgress(first.nextProgress, {
      kind: "daily",
      nextStreak: 6,
      dailyDateKey: "2026-11-20",
    });
    expect(repeat.nextProgress.dailyCompletedDates).toEqual(["2026-11-20"]);
    expect(repeat.newlyUnlockedStamp).toBeNull();
  });

  it("increments sudoku4x4Solved and unlocks a stamp on a 4x4 solve", () => {
    const { nextProgress, newlyUnlockedStamp } = applySolveToProgress(baseProgress(), {
      kind: "sudoku-4x4",
      nextStreak: 1,
    });

    expect(nextProgress.sudoku4x4Solved).toBe(1);
    expect(nextProgress.totalSolved).toBe(1);
    expect(newlyUnlockedStamp?.requiredRewards).toBe(1);
  });
});
