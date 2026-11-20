import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck, Sparkles } from "lucide-react";
import { DAILY_SIZE, generateDailyPuzzles } from "../../engine/make-sum/puzzle";
import { MakeSumSession } from "../../ui/MakeSumSession";
import type { GameModeProps } from "../contract";

export function DailyView({
  todayKey,
  streak,
  onStreakChange,
  progressStore,
  modalsOpen,
  onChangeMode,
  onOpenShelf,
  onProgressSnapshot,
}: GameModeProps) {
  const dailyPuzzles = useMemo(() => generateDailyPuzzles(todayKey), [todayKey]);
  const [finishedRun, setFinishedRun] = useState(false);

  const handleSequenceComplete = useCallback(() => {
    setFinishedRun(true);
  }, []);

  useEffect(() => {
    if (!finishedRun) return;
    onProgressSnapshot({
      starsInSet: DAILY_SIZE,
      setSize: DAILY_SIZE,
      dailyLabel: `Daily · ${DAILY_SIZE}/${DAILY_SIZE}`,
    });
  }, [finishedRun, onProgressSnapshot]);

  const sequence = useMemo(
    () => ({
      puzzles: dailyPuzzles,
      todayKey,
      onSequenceComplete: handleSequenceComplete,
    }),
    [dailyPuzzles, handleSequenceComplete, todayKey],
  );

  if (finishedRun) {
    return (
      <main className="flex-1 w-full max-w-md mx-auto px-4 flex flex-col items-center justify-center gap-4 py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full rounded-3xl cs-surface border p-6 text-center shadow-[0_14px_36px_-12px_rgba(0,0,0,0.14)]"
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-sage-wash border border-sage/45 text-sage-deep flex items-center justify-center">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <h2 className="font-display text-2xl font-bold text-ink">Daily 5 Complete!</h2>
          <p className="text-sm font-semibold text-ink-soft mt-1">
            You solved all 5 squares for <span className="text-ink font-bold">{todayKey}</span>.
            Come back tomorrow for a fresh set!
          </p>

          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onChangeMode("classic")}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl next-cta text-white font-display text-base font-semibold [@media(hover:hover)]:hover:brightness-105 cursor-pointer"
            >
              Play Free 2×2
            </button>
            <button
              type="button"
              onClick={onOpenShelf}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl cs-pill border text-ink font-bold text-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-warm" />
              <span>View Stamp Shelf</span>
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <MakeSumSession
      missingCount={1}
      targetSum={10}
      streak={streak}
      onStreakChange={onStreakChange}
      progressStore={progressStore}
      modalsOpen={modalsOpen}
      sequence={sequence}
      onProgressSnapshot={onProgressSnapshot}
    />
  );
}
