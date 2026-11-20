import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Grip, Lightbulb, RefreshCw } from "lucide-react";
import {
  SET_SIZE,
  evaluateGuess,
  evaluateMultiGuess,
  generatePuzzle,
  getHintChoices,
  getWrongFeedback,
  type Puzzle,
  type QuadrantIndex,
  type TargetSum,
} from "../engine/make-sum/puzzle";
import { fireSetCompleteConfetti, fireSolvedConfetti } from "../platform/confetti";
import { soundEngine, triggerHaptic } from "../platform/sound";
import { useManagedTimers } from "../platform/timers";
import type { ProgressStore } from "../state/useProgress";
import { NumberPad } from "./NumberPad";
import { PuzzleBoard } from "./PuzzleBoard";
import { TenFrameHint } from "./TenFrameHint";

const AUTO_ADVANCE_NORMAL_MS = 4236; // φ³ × 1000 ms
const AUTO_ADVANCE_MILESTONE_MS = 5236; // 2φ² × 1000 ms (same 2/φ ratio)

const DIGITS_5 = [0, 1, 2, 3, 4, 5] as const;
const DIGITS_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DIGITS_20 = Array.from({ length: 21 }, (_, i) => i);

type FeedbackState =
  | { kind: "idle" }
  | { kind: "wrong"; message: string }
  | {
      kind: "solved";
      milestone: string | null;
      justCompletedSet: boolean;
      autoAdvanceMs: number;
    };

export interface MakeSumSessionProps {
  missingCount: 1 | 2;
  targetSum: TargetSum;
  streak: number;
  onStreakChange: (next: number) => void;
  progressStore: ProgressStore;
  modalsOpen: boolean;
  /** Optional fixed puzzle sequence (used by Daily 5 mode). */
  sequence?: {
    puzzles: readonly Puzzle[];
    todayKey: string;
    onSequenceComplete: () => void;
  };
  onProgressSnapshot: (snapshot: {
    starsInSet: number;
    setSize: number;
    dailyLabel: string | null;
  }) => void;
}

export function MakeSumSession({
  missingCount,
  targetSum,
  streak,
  onStreakChange,
  progressStore,
  modalsOpen,
  sequence,
  onProgressSnapshot,
}: MakeSumSessionProps) {
  const isSequence = Boolean(sequence);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle>(() =>
    sequence ? sequence.puzzles[0] : generatePuzzle({ targetSum, missingCount }),
  );
  const [solved, setSolved] = useState(false);
  const [starsInSet, setStarsInSet] = useState(0);
  const [triedWrong, setTriedWrong] = useState<Set<number>>(() => new Set());
  const [filledSlots, setFilledSlots] = useState<Partial<Record<QuadrantIndex, number>>>({});
  const [activeSlotIndex, setActiveSlotIndex] = useState<QuadrantIndex>(() => puzzle.missingIndex);
  const [wrongGuess, setWrongGuess] = useState<number | null>(null);
  const [wrongSlotIndex, setWrongSlotIndex] = useState<QuadrantIndex | null>(null);
  const [wrongAttemptKey, setWrongAttemptKey] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle" });
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [hintChoices, setHintChoices] = useState<number[] | null>(null);
  const [pendingTypedPrefix, setPendingTypedPrefix] = useState("");
  const [hoveredDropIndex, setHoveredDropIndex] = useState<number | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const timers = useManagedTimers();
  const prevTargetRef = useRef(targetSum);

  const loadPuzzle = useCallback(
    (nextPuzzle: Puzzle, resetSetStars = false) => {
      timers.cancelAll();
      setPuzzle(nextPuzzle);
      setSolved(false);
      setTriedWrong(new Set());
      setFilledSlots({});
      setActiveSlotIndex(nextPuzzle.missingIndex);
      setWrongGuess(null);
      setWrongSlotIndex(null);
      setFeedback({ kind: "idle" });
      setHintLevel(0);
      setHintChoices(null);
      setPendingTypedPrefix("");
      setHoveredDropIndex(null);
      if (resetSetStars) {
        setStarsInSet(0);
      }
    },
    [timers],
  );

  // Regenerate puzzle cleanly when targetSum changes in Settings
  useEffect(() => {
    if (isSequence) return;
    if (prevTargetRef.current === targetSum) return;
    prevTargetRef.current = targetSum;
    loadPuzzle(generatePuzzle({ targetSum, missingCount }), false);
  }, [isSequence, loadPuzzle, missingCount, targetSum]);

  // Publish live progress snapshot for SettingsModal
  useEffect(() => {
    if (sequence) {
      const total = sequence.puzzles.length;
      onProgressSnapshot({
        starsInSet: sequenceIndex + (solved ? 1 : 0),
        setSize: total,
        dailyLabel: `Daily · ${Math.min(sequenceIndex + 1, total)}/${total}`,
      });
    } else {
      onProgressSnapshot({
        starsInSet,
        setSize: SET_SIZE,
        dailyLabel: null,
      });
    }
  }, [onProgressSnapshot, sequence, sequenceIndex, solved, starsInSet]);

  const startNext = useCallback(
    (resetSetStars = false) => {
      if (sequence) {
        const nextIdx = sequenceIndex + 1;
        if (nextIdx >= sequence.puzzles.length) {
          timers.cancelAll();
          sequence.onSequenceComplete();
          return;
        }
        setSequenceIndex(nextIdx);
        loadPuzzle(sequence.puzzles[nextIdx], false);
        return;
      }

      const next = generatePuzzle({ targetSum, missingCount, previous: puzzle });
      loadPuzzle(next, resetSetStars);
    },
    [loadPuzzle, missingCount, puzzle, sequence, sequenceIndex, targetSum, timers],
  );

  const getBoardOrigin = useCallback(() => {
    const el = boardRef.current;
    if (!el) return { x: 0.5, y: 0.44 };
    const rect = el.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }, []);

  const celebrateWin = useCallback(
    (finalSlots: Partial<Record<QuadrantIndex, number>>) => {
      setFilledSlots(finalSlots);
      setWrongGuess(null);
      setWrongSlotIndex(null);
      setSolved(true);

      const nextStreak = streak + 1;
      onStreakChange(nextStreak);

      const justFinishedSequence = Boolean(
        sequence && sequenceIndex === sequence.puzzles.length - 1,
      );
      const nextStarsInSet = sequence ? sequenceIndex + 1 : starsInSet + 1;
      const justCompletedSet = !sequence && nextStarsInSet >= SET_SIZE;

      if (!sequence) {
        setStarsInSet(nextStarsInSet);
      }

      progressStore.recordSolve({
        kind: sequence ? "daily" : "2x2",
        nextStreak,
        completedSet: justCompletedSet,
        dailyDateKey: justFinishedSequence && sequence ? sequence.todayKey : undefined,
      });

      const milestone = justFinishedSequence
        ? "Daily 5 complete!"
        : justCompletedSet
          ? "★ 5 stars!"
          : nextStreak > 0 && nextStreak % 5 === 0
            ? `🔥 ${nextStreak} in a row!`
            : null;

      const delayMs =
        justCompletedSet || justFinishedSequence
          ? AUTO_ADVANCE_MILESTONE_MS
          : AUTO_ADVANCE_NORMAL_MS;

      setFeedback({
        kind: "solved",
        milestone,
        justCompletedSet: justCompletedSet || justFinishedSequence,
        autoAdvanceMs: delayMs,
      });

      if (justCompletedSet || justFinishedSequence || (nextStreak > 0 && nextStreak % 5 === 0)) {
        soundEngine.playSetComplete();
        triggerHaptic("setComplete");
        fireSetCompleteConfetti();
      } else {
        soundEngine.playCorrect(nextStreak);
        triggerHaptic("correct");
        fireSolvedConfetti(getBoardOrigin());
      }

      timers.schedule(
        "auto-advance",
        () => {
          if (justFinishedSequence && sequence) {
            sequence.onSequenceComplete();
          } else {
            startNext(justCompletedSet);
          }
        },
        delayMs,
      );
    },
    [
      getBoardOrigin,
      onStreakChange,
      progressStore,
      sequence,
      sequenceIndex,
      starsInSet,
      startNext,
      streak,
      timers,
    ],
  );

  const handleSelectNumber = useCallback(
    (digit: number, explicitSlot?: QuadrantIndex) => {
      if (solved) return;

      timers.cancel("multi-digit");
      setPendingTypedPrefix("");

      // Single-missing mode (Classic & Daily)
      if (puzzle.missingCount === 1) {
        if (triedWrong.has(digit)) return;
        const evaluation = evaluateGuess(puzzle, digit);

        if (evaluation.status === "correct") {
          timers.cancel("wrong-clear");
          celebrateWin({ [puzzle.missingIndex]: digit });
        } else {
          soundEngine.playWrong();
          triggerHaptic("wrong");
          onStreakChange(0);
          setWrongGuess(digit);
          setWrongSlotIndex(puzzle.missingIndex);
          setWrongAttemptKey((k) => k + 1);
          setTriedWrong((prev) => {
            const next = new Set(prev);
            next.add(digit);
            return next;
          });
          setFeedback({ kind: "wrong", message: getWrongFeedback(evaluation) });

          timers.schedule(
            "wrong-clear",
            () => {
              setWrongGuess(null);
              setWrongSlotIndex(null);
            },
            760,
          );
        }
        return;
      }

      // Open-ended 2-Missing mode
      const targetSlot =
        explicitSlot !== undefined && puzzle.missingIndices.includes(explicitSlot)
          ? explicitSlot
          : activeSlotIndex;

      const nextFilled: Partial<Record<QuadrantIndex, number>> = {
        ...filledSlots,
        [targetSlot]: digit,
      };

      const otherSlot = puzzle.missingIndices.find((i) => i !== targetSlot)!;

      if (nextFilled[otherSlot] === undefined) {
        soundEngine.playTap();
        triggerHaptic("tap");
        setFilledSlots(nextFilled);
        setActiveSlotIndex(otherSlot);
        setFeedback({ kind: "idle" });
        if (hintLevel === 2) {
          setHintChoices(getHintChoices(puzzle, Math.random, digit));
        }
        return;
      }

      const evaluation = evaluateMultiGuess(puzzle, nextFilled);
      if (!evaluation) return;

      if (evaluation.status === "correct") {
        celebrateWin(nextFilled);
      } else {
        soundEngine.playWrong();
        triggerHaptic("wrong");
        onStreakChange(0);
        setWrongGuess(digit);
        setWrongSlotIndex(targetSlot);
        setWrongAttemptKey((k) => k + 1);
        setFeedback({ kind: "wrong", message: getWrongFeedback(evaluation) });

        const keptOther: Partial<Record<QuadrantIndex, number>> = {
          [otherSlot]: nextFilled[otherSlot],
        };
        setFilledSlots(keptOther);
        setActiveSlotIndex(targetSlot);

        timers.schedule(
          "wrong-clear",
          () => {
            setWrongGuess(null);
            setWrongSlotIndex(null);
          },
          760,
        );
      }
    },
    [
      activeSlotIndex,
      celebrateWin,
      filledSlots,
      hintLevel,
      onStreakChange,
      puzzle,
      solved,
      timers,
      triedWrong,
    ],
  );

  const handleSelectSlot = useCallback(
    (index: QuadrantIndex) => {
      if (solved || !puzzle.missingIndices.includes(index)) return;
      soundEngine.playTap();
      triggerHaptic("tap");

      if (filledSlots[index] !== undefined) {
        setFilledSlots((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
        setFeedback({ kind: "idle" });
      }
      setActiveSlotIndex(index);
    },
    [filledSlots, puzzle.missingIndices, solved],
  );

  const handleHint = useCallback(() => {
    if (solved || hintLevel >= 2) return;
    soundEngine.playHint();
    triggerHaptic("tap");

    if (hintLevel === 0) {
      setHintLevel(1);
    } else if (hintLevel === 1) {
      setHintLevel(2);
      const alreadyFilledSum = Object.values(filledSlots).reduce((acc, v) => acc + (v ?? 0), 0);
      setHintChoices(getHintChoices(puzzle, Math.random, alreadyFilledSum));
    }
  }, [filledSlots, hintLevel, puzzle, solved]);

  const handleSkip = useCallback(() => {
    soundEngine.playTap();
    triggerHaptic("tap");
    startNext(false);
  }, [startNext]);

  const handleTogglePips = useCallback(() => {
    soundEngine.playTap();
    triggerHaptic("tap");
    progressStore.togglePips();
  }, [progressStore]);

  // Mode-scoped keyboard controls
  useEffect(() => {
    if (modalsOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "h" || e.key === "H") {
        handleHint();
        return;
      }

      if (solved) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startNext(starsInSet >= SET_SIZE);
        }
        return;
      }

      if (e.key === "Enter" && pendingTypedPrefix) {
        timers.cancel("multi-digit");
        const val = Number(pendingTypedPrefix);
        setPendingTypedPrefix("");
        handleSelectNumber(val);
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        const digit = Number(e.key);

        if (pendingTypedPrefix) {
          timers.cancel("multi-digit");
          const combined = Number(`${pendingTypedPrefix}${digit}`);
          setPendingTypedPrefix("");
          if (combined <= puzzle.targetSum) {
            handleSelectNumber(combined);
          } else {
            handleSelectNumber(digit);
          }
          return;
        }

        const shouldWaitForTwoDigit =
          (puzzle.targetSum === 10 && digit === 1 && puzzle.neededSum >= 10) ||
          (puzzle.targetSum === 20 && (digit === 1 || digit === 2));

        if (shouldWaitForTwoDigit) {
          soundEngine.playTap();
          setPendingTypedPrefix(String(digit));
          timers.schedule(
            "multi-digit",
            () => {
              setPendingTypedPrefix("");
              handleSelectNumber(digit);
            },
            680,
          );
          return;
        }

        if (digit <= puzzle.targetSum) {
          handleSelectNumber(digit);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleHint,
    handleSelectNumber,
    modalsOpen,
    pendingTypedPrefix,
    puzzle.neededSum,
    puzzle.targetSum,
    solved,
    starsInSet,
    startNext,
    timers,
  ]);

  const completedNumbers = puzzle.cells.map((c, idx) =>
    c === null ? (filledSlots[idx as QuadrantIndex] ?? puzzle.answer) : c,
  );

  const activeDigits =
    puzzle.targetSum === 5 ? DIGITS_5 : puzzle.targetSum === 20 ? DIGITS_20 : DIGITS_10;

  const winningDigits = useMemo(() => {
    if (!solved) return undefined;
    const set = new Set<number>();
    for (const idx of puzzle.missingIndices) {
      const val = filledSlots[idx] ?? puzzle.answer;
      set.add(val);
    }
    return set;
  }, [filledSlots, puzzle.answer, puzzle.missingIndices, solved]);

  const isLastInSequence = Boolean(sequence && sequenceIndex === sequence.puzzles.length - 1);

  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-3 sm:px-4 flex flex-col items-center justify-center gap-2.5 sm:gap-3 py-1 [@media(orientation:landscape)_and_(max-height:520px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:520px)]:grid [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[auto_1fr] [@media(orientation:landscape)_and_(max-height:520px)]:items-center [@media(orientation:landscape)_and_(max-height:520px)]:gap-5">
      {/* Left column in mobile landscape: Board */}
      <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
        <PuzzleBoard
          puzzle={puzzle}
          solved={solved}
          filledSlots={filledSlots}
          activeSlotIndex={activeSlotIndex}
          onSelectSlot={handleSelectSlot}
          wrongGuess={wrongGuess}
          wrongSlotIndex={wrongSlotIndex}
          wrongAttemptKey={wrongAttemptKey}
          hintLevel={hintLevel}
          pipsEnabled={progressStore.progress.pipsEnabled}
          pendingTypedPrefix={pendingTypedPrefix}
          hoveredDropIndex={hoveredDropIndex}
          boardRef={boardRef}
        />
      </div>

      {/* Right column in mobile landscape: Feedback + Frame + NumberPad + Actions */}
      <div className="w-full flex flex-col items-center gap-2.5 sm:gap-3">
        {/* Stable-height Feedback / Standalone Equation Slot */}
        <div className="w-full max-w-md min-h-[42px] sm:min-h-[46px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {feedback.kind === "solved" ? (
              <motion.div
                key={`solved-eq-${puzzle.id}`}
                initial={{ opacity: 0, y: 6, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ type: "spring", stiffness: 460, damping: 24 }}
                role="status"
                aria-live="polite"
                className="flex items-center justify-center"
              >
                <div className="font-display text-[1.75rem] sm:text-[2rem] font-bold text-ink flex flex-wrap items-center justify-center leading-none tracking-tight">
                  {completedNumbers.map((n, idx) => (
                    <span key={idx} className="inline-flex items-center">
                      {idx > 0 && (
                        <span className="mx-1.5 sm:mx-2 font-sans text-xl sm:text-2xl font-extrabold text-[var(--cs-ink-muted)]">
                          +
                        </span>
                      )}
                      <span
                        className={
                          puzzle.missingIndices.includes(idx as QuadrantIndex)
                            ? "eq-ans-chip inline-flex items-center justify-center min-w-[2.25rem] sm:min-w-[2.5rem] px-2 sm:px-2.5 py-1 rounded-xl text-white leading-none"
                            : ""
                        }
                      >
                        {n}
                      </span>
                    </span>
                  ))}
                  <span className="mx-2 font-sans text-xl sm:text-2xl font-extrabold text-[var(--cs-ink-muted)]">
                    =
                  </span>
                  <span className="text-sage-deep">{puzzle.targetSum}</span>
                </div>
              </motion.div>
            ) : feedback.kind === "wrong" ? (
              <motion.div
                key={`wrong-${wrongAttemptKey}`}
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ duration: 0.14 }}
                role="status"
                aria-live="polite"
                className="px-3.5 py-1.5 rounded-2xl bg-coral-wash border border-coral/45 text-coral-deep text-xs sm:text-sm font-bold text-center"
              >
                {feedback.message}
              </motion.div>
            ) : (
              <motion.p
                key={`idle-${missingCount}-${hintLevel}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                className="text-xs sm:text-sm font-semibold text-ink-soft text-center"
              >
                {hintLevel === 2 ? (
                  <span>
                    Highlighted <strong className="text-amber-deep">3 choices</strong> below — which
                    one makes {puzzle.targetSum}?
                  </span>
                ) : missingCount === 2 ? (
                  "Any pair that reaches the target wins — tap or drag!"
                ) : (
                  "Tap or drag a number into the glowing square"
                )}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Expandable Five / Ten / Double-Ten Frame Visual Hint */}
        <AnimatePresence>
          {hintLevel >= 1 && (
            <TenFrameHint
              puzzle={puzzle}
              hintLevel={hintLevel}
              solved={solved}
              filledSlots={filledSlots}
            />
          )}
        </AnimatePresence>

        {/* Tactile Number Pad with Tap + Drag-and-Drop */}
        <NumberPad
          digits={activeDigits}
          onSelect={(digit) => handleSelectNumber(digit)}
          onDropOnTarget={(digit, targetIdx) =>
            handleSelectNumber(digit, targetIdx as QuadrantIndex)
          }
          onHoverDropTarget={setHoveredDropIndex}
          dropAttribute="data-drop-quadrant"
          triedWrong={triedWrong}
          solved={solved}
          winningDigits={winningDigits}
          hintChoices={hintChoices}
        />

        {/* Secondary actions — swaps cleanly into Next CTA while solved (Option A1) */}
        <div className="min-h-[42px] flex items-center justify-center pt-0.5">
          <AnimatePresence mode="wait">
            {feedback.kind === "solved" ? (
              <motion.div
                key={`solved-actions-${puzzle.id}`}
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ duration: 0.16 }}
                className="flex items-center justify-center flex-wrap gap-2.5"
              >
                {feedback.milestone && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-wash border border-amber-warm/60 text-amber-deep text-xs sm:text-sm font-extrabold">
                    {feedback.milestone}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => startNext(feedback.justCompletedSet)}
                  className="next-cta relative overflow-hidden inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-white text-sm font-extrabold [@media(hover:hover)]:hover:brightness-105 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
                >
                  <span
                    aria-hidden="true"
                    className="next-progress-fill pointer-events-none absolute inset-0 bg-white/22"
                    style={{ animationDuration: `${feedback.autoAdvanceMs}ms` }}
                  />
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <span>{isLastInSequence ? "Finish" : "Next"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="play-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                className="flex items-center justify-center flex-wrap gap-2"
              >
                <button
                  type="button"
                  onClick={handleHint}
                  disabled={solved || hintLevel >= 2}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
                    solved || hintLevel >= 2
                      ? "cs-subtle-btn-disabled cursor-default"
                      : hintLevel === 1
                        ? "cs-subtle-btn-active cursor-pointer"
                        : "cs-subtle-btn cursor-pointer"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>
                    {hintLevel === 0 ? "Hint" : hintLevel === 1 ? "Narrow choices" : "Hint shown"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePips}
                  aria-pressed={progressStore.progress.pipsEnabled}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
                    progressStore.progress.pipsEnabled ? "cs-subtle-btn-active" : "cs-subtle-btn"
                  }`}
                >
                  <Grip className="w-3.5 h-3.5" />
                  <span>Dots</span>
                </button>

                {!isSequence && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    aria-label="New square"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cs-subtle-btn border cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
