import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { SET_SIZE } from "../../engine/make-sum/puzzle";
import { fireSetCompleteConfetti } from "../../platform/confetti";
import { soundEngine, triggerHaptic } from "../../platform/sound";
import { useManagedTimers } from "../../platform/timers";
import { NumberPad } from "../../ui/NumberPad";
import type { GameModeProps } from "../contract";
import {
  checkSudokuConflict,
  generateSudoku4x4,
  getBoxIndex,
  getSudokuHint,
  isBoxComplete,
  isSudokuSolved,
  type Sudoku4x4Puzzle,
} from "./sudoku4x4";
import { Sudoku4x4Board } from "./Sudoku4x4Board";

const DIGITS_SUDOKU = [1, 2, 3, 4] as const;

type FeedbackState = { kind: "idle" } | { kind: "wrong"; message: string } | { kind: "solved" };

function firstEmptyCell(board: Array<number | null>): number | null {
  const idx = board.findIndex((v) => v === null);
  return idx === -1 ? null : idx;
}

export function Sudoku4x4View({
  streak,
  onStreakChange,
  progressStore,
  modalsOpen,
  onProgressSnapshot,
}: GameModeProps) {
  const [puzzle, setPuzzle] = useState<Sudoku4x4Puzzle>(() => generateSudoku4x4());
  const [board, setBoard] = useState<Array<number | null>>(() => [...puzzle.givens]);
  const [selected, setSelected] = useState<number | null>(() => firstEmptyCell(puzzle.givens));
  const [conflicts, setConflicts] = useState<Set<number>>(() => new Set());
  const [conflictKey, setConflictKey] = useState(0);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle" });
  const [hoveredDropIndex, setHoveredDropIndex] = useState<number | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const timers = useManagedTimers();

  useEffect(() => {
    onProgressSnapshot({
      starsInSet: progressStore.progress.setsCompleted % SET_SIZE,
      setSize: SET_SIZE,
      dailyLabel: null,
    });
  }, [onProgressSnapshot, progressStore.progress.setsCompleted]);

  const startFreshBoard = useCallback(() => {
    timers.cancelAll();
    const next = generateSudoku4x4();
    setPuzzle(next);
    setBoard([...next.givens]);
    setSelected(firstEmptyCell(next.givens));
    setConflicts(new Set());
    setSolved(false);
    setFeedback({ kind: "idle" });
    setHoveredDropIndex(null);
  }, [timers]);

  const handlePlaceDigit = useCallback(
    (digit: number, explicitIndex?: number) => {
      if (solved) return;
      const cellIdx = explicitIndex ?? selected;
      if (cellIdx === null || puzzle.givens[cellIdx] !== null) return;

      const conflict = checkSudokuConflict(board, cellIdx, digit);
      if (conflict) {
        soundEngine.playWrong();
        triggerHaptic("wrong");
        setConflicts(new Set([cellIdx, ...conflict.conflictingIndices]));
        setConflictKey((k) => k + 1);
        setFeedback({ kind: "wrong", message: conflict.message });
        timers.schedule("wrong-clear", () => setConflicts(new Set()), 900);
        return;
      }

      const nextBoard = [...board];
      const boxIdx = getBoxIndex(cellIdx);
      const wasBoxDone = isBoxComplete(board, boxIdx);
      nextBoard[cellIdx] = digit;
      const nowBoxDone = isBoxComplete(nextBoard, boxIdx);

      setBoard(nextBoard);
      setConflicts(new Set());

      if (isSudokuSolved(nextBoard)) {
        setSolved(true);
        setSelected(null);
        const nextStreak = streak + 1;
        onStreakChange(nextStreak);
        progressStore.recordSolve({ kind: "sudoku-4x4", nextStreak });
        setFeedback({ kind: "solved" });
        soundEngine.playSetComplete();
        triggerHaptic("setComplete");
        fireSetCompleteConfetti();
        return;
      }

      if (!wasBoxDone && nowBoxDone) {
        soundEngine.playCorrect(1);
        triggerHaptic("correct");
      } else {
        soundEngine.playTap();
        triggerHaptic("tap");
      }
      setFeedback({ kind: "idle" });
      setSelected(firstEmptyCell(nextBoard));
    },
    [board, onStreakChange, progressStore, puzzle.givens, selected, solved, streak, timers],
  );

  const handleEraseCell = useCallback(() => {
    if (solved || selected === null) return;
    if (puzzle.givens[selected] !== null) return;
    if (board[selected] === null) return;

    soundEngine.playTap();
    triggerHaptic("tap");
    setBoard((prev) => {
      const next = [...prev];
      next[selected] = null;
      return next;
    });
    setFeedback({ kind: "idle" });
  }, [board, puzzle.givens, selected, solved]);

  const handleHint = useCallback(() => {
    if (solved) return;
    const hint = getSudokuHint(puzzle, board);
    if (!hint) return;
    soundEngine.playHint();
    triggerHaptic("tap");
    setSelected(hint.index);
    handlePlaceDigit(hint.digit, hint.index);
  }, [board, handlePlaceDigit, puzzle, solved]);

  const handleSkip = useCallback(() => {
    soundEngine.playTap();
    triggerHaptic("tap");
    startFreshBoard();
  }, [startFreshBoard]);

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
          startFreshBoard();
        }
        return;
      }

      if (e.key >= "1" && e.key <= "4") {
        handlePlaceDigit(Number(e.key));
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleEraseCell();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleEraseCell, handleHint, handlePlaceDigit, modalsOpen, solved, startFreshBoard]);

  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-3 sm:px-4 flex flex-col items-center justify-center gap-2.5 sm:gap-3 py-1 [@media(orientation:landscape)_and_(max-height:520px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:520px)]:grid [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[auto_1fr] [@media(orientation:landscape)_and_(max-height:520px)]:items-center [@media(orientation:landscape)_and_(max-height:520px)]:gap-5">
      <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
        <Sudoku4x4Board
          puzzle={puzzle}
          board={board}
          selectedIndex={selected}
          onSelectCell={(idx) => {
            soundEngine.playTap();
            triggerHaptic("tap");
            setSelected(idx);
            setFeedback({ kind: "idle" });
          }}
          conflictIndices={conflicts}
          conflictKey={conflictKey}
          hoveredDropIndex={hoveredDropIndex}
          solved={solved}
          boardRef={boardRef}
        />
      </div>

      <div className="w-full flex flex-col items-center gap-2.5 sm:gap-3">
        <div className="w-full max-w-md min-h-[42px] sm:min-h-[46px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {feedback.kind === "solved" ? (
              <motion.div
                key={`solved-sudoku-${puzzle.id}`}
                initial={{ opacity: 0, y: 6, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ type: "spring", stiffness: 460, damping: 24 }}
                role="status"
                aria-live="polite"
                className="flex items-center justify-center"
              >
                <span className="font-display text-xl sm:text-2xl font-bold text-sage-deep inline-flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-sage" />
                  <span>Every box makes 10!</span>
                </span>
              </motion.div>
            ) : feedback.kind === "wrong" ? (
              <motion.div
                key={`wrong-${conflictKey}`}
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
                key="idle-sudoku"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                className="text-xs sm:text-sm font-semibold text-ink-soft text-center"
              >
                Tap or drag 1–4 into any open square
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <NumberPad
          digits={DIGITS_SUDOKU}
          onSelect={(digit) => handlePlaceDigit(digit)}
          onDropOnTarget={(digit, targetIdx) => {
            setSelected(targetIdx);
            handlePlaceDigit(digit, targetIdx);
          }}
          onHoverDropTarget={setHoveredDropIndex}
          dropAttribute="data-drop-sudoku"
          solved={solved}
          showErase
          onErase={handleEraseCell}
        />

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
                <button
                  type="button"
                  onClick={startFreshBoard}
                  className="next-cta relative overflow-hidden inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-white text-sm font-extrabold [@media(hover:hover)]:hover:brightness-105 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
                >
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <span>New Board</span>
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
                  disabled={solved}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
                    solved
                      ? "cs-subtle-btn-disabled cursor-default"
                      : "cs-subtle-btn cursor-pointer"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Hint</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  aria-label="New 4 by 4 board"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cs-subtle-btn border cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
