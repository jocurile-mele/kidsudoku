import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowRight, CalendarCheck, Grip, Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import {
  DAILY_SIZE,
  SET_SIZE,
  evaluateGuess,
  evaluateMultiGuess,
  generateDailyPuzzles,
  generatePuzzle,
  getHintChoices,
  getTodayDateKey,
  getWrongFeedback,
  type Puzzle,
  type QuadrantIndex,
  type TargetSum,
} from "./game/puzzle";
import {
  checkSudokuConflict,
  generateSudoku4x4,
  getBoxIndex,
  getSudokuHint,
  isBoxComplete,
  isSudokuSolved,
  type Sudoku4x4Puzzle,
} from "./game/sudoku4x4";
import { STAMPS, type StampDefinition, type StampId, type ThemeId } from "./game/stamps";
import { soundEngine, triggerHaptic } from "./game/sound";
import { fireSetCompleteConfetti, fireSolvedConfetti } from "./game/confetti";
import {
  getTotalRewardCount,
  loadProgress,
  saveProgress,
  type PersistedProgress,
} from "./game/storage";
import { Header } from "./components/Header";
import { ModeBar, type GameMode } from "./components/ModeBar";
import { PuzzleBoard } from "./components/PuzzleBoard";
import { Sudoku4x4Board } from "./components/Sudoku4x4Board";
import { TenFrameHint } from "./components/TenFrameHint";
import { NumberPad } from "./components/NumberPad";
import { StampShelfModal } from "./components/StampShelfModal";
import { StampIcon } from "./components/StampIcon";
import { HowToPlayModal } from "./components/HowToPlayModal";
import { SettingsModal } from "./components/SettingsModal";

type FeedbackState =
  | { kind: "idle" }
  | { kind: "wrong"; message: string }
  | {
      kind: "solved";
      milestone: string | null;
      justCompletedSet: boolean;
      autoAdvanceMs: number | null;
    };

const AUTO_ADVANCE_NORMAL_MS = 4236; // φ³ × 1000 ms
const AUTO_ADVANCE_MILESTONE_MS = 5236; // 2φ² × 1000 ms (same 2/φ ratio)

const THEME_META_COLORS: Record<ThemeId, string> = {
  "warm-paper": "#FBF7EF",
  "matcha-garden": "#F2F7F0",
  "cozy-dusk": "#1D222E",
};

const DIGITS_5 = [0, 1, 2, 3, 4, 5] as const;
const DIGITS_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DIGITS_20 = Array.from({ length: 21 }, (_, i) => i);
const DIGITS_SUDOKU = [1, 2, 3, 4] as const;

function firstEmptySudokuCell(board: Array<number | null>): number | null {
  const idx = board.findIndex((v) => v === null);
  return idx === -1 ? null : idx;
}

export default function App() {
  const [progress, setProgress] = useState<PersistedProgress>(() => {
    const loaded = loadProgress();
    soundEngine.setEnabled(loaded.soundEnabled);
    return loaded;
  });

  const todayKey = useMemo(() => getTodayDateKey(), []);
  const dailyPuzzles = useMemo(() => generateDailyPuzzles(todayKey), [todayKey]);

  const [mode, setMode] = useState<GameMode>("classic");
  const targetSum = progress.targetSum;

  // 2x2 / 2-Blank / Daily state
  const [puzzle, setPuzzle] = useState<Puzzle>(() =>
    generatePuzzle({ targetSum: progress.targetSum, missingCount: 1 }),
  );
  const [dailyIndex, setDailyIndex] = useState(0);
  const [dailyFinishedRun, setDailyFinishedRun] = useState(false);

  const [solved, setSolved] = useState(false);
  const [streak, setStreak] = useState(0);
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

  // 4x4 KidSudoku state
  const [sudokuPuzzle, setSudokuPuzzle] = useState<Sudoku4x4Puzzle>(() => generateSudoku4x4());
  const [sudokuBoard, setSudokuBoard] = useState<Array<number | null>>(() => [
    ...sudokuPuzzle.givens,
  ]);
  const [sudokuSelected, setSudokuSelected] = useState<number | null>(() =>
    firstEmptySudokuCell(sudokuPuzzle.givens),
  );
  const [sudokuConflicts, setSudokuConflicts] = useState<Set<number>>(() => new Set());
  const [sudokuConflictKey, setSudokuConflictKey] = useState(0);
  const [sudokuSolved, setSudokuSolved] = useState(false);

  // Modals, logo sound, stamp unlock toast
  const [helpOpen, setHelpOpen] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoPlaying, setLogoPlaying] = useState(false);
  const [logoPressCount, setLogoPressCount] = useState(0);
  const [unlockedToast, setUnlockedToast] = useState<StampDefinition | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const wrongClearTimerRef = useRef<number | null>(null);
  const multiDigitTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const rewardCount = getTotalRewardCount(progress);
  const hasUnseenReward = rewardCount > progress.seenRewardCount;
  const dailyCompletedToday = progress.dailyCompletedDates.includes(todayKey);

  // Sync persisted progress & active theme
  useEffect(() => {
    saveProgress(progress);
    soundEngine.setEnabled(progress.soundEnabled);
    document.documentElement.setAttribute("data-theme", progress.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", THEME_META_COLORS[progress.theme]);
    }
  }, [progress]);

  // Unlock iOS Safari AudioContext & pre-decode logo clip on first user touch/click
  useEffect(() => {
    const unlockOnce = () => {
      soundEngine.unlock();
      window.removeEventListener("pointerdown", unlockOnce);
    };
    window.addEventListener("pointerdown", unlockOnce, { passive: true });
    return () => window.removeEventListener("pointerdown", unlockOnce);
  }, []);

  const clearTimers = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (wrongClearTimerRef.current !== null) {
      window.clearTimeout(wrongClearTimerRef.current);
      wrongClearTimerRef.current = null;
    }
    if (multiDigitTimerRef.current !== null) {
      window.clearTimeout(multiDigitTimerRef.current);
      multiDigitTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [clearTimers]);

  const showStampToastIfUnlocked = useCallback(
    (prevRewardCount: number, nextRewardCount: number) => {
      const newlyUnlocked = STAMPS.find(
        (s) => s.requiredRewards > prevRewardCount && s.requiredRewards <= nextRewardCount,
      );
      if (!newlyUnlocked) return;
      setUnlockedToast(newlyUnlocked);
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setUnlockedToast(null);
        toastTimerRef.current = null;
      }, 4200);
    },
    [],
  );

  const load2x2Puzzle = useCallback(
    (nextPuzzle: Puzzle, resetSetStars = false) => {
      clearTimers();
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
    [clearTimers],
  );

  const startFreshSudoku = useCallback(() => {
    clearTimers();
    const next = generateSudoku4x4();
    setSudokuPuzzle(next);
    setSudokuBoard([...next.givens]);
    setSudokuSelected(firstEmptySudokuCell(next.givens));
    setSudokuConflicts(new Set());
    setSudokuSolved(false);
    setFeedback({ kind: "idle" });
    setHoveredDropIndex(null);
  }, [clearTimers]);

  const startNext2x2 = useCallback(
    (resetSetStars = false) => {
      if (mode === "daily") {
        const nextIdx = dailyIndex + 1;
        if (nextIdx >= DAILY_SIZE) {
          setDailyFinishedRun(true);
          return;
        }
        setDailyIndex(nextIdx);
        load2x2Puzzle(dailyPuzzles[nextIdx], false);
        return;
      }

      const missingCount = mode === "two-blank" ? 2 : 1;
      const next = generatePuzzle({
        targetSum,
        missingCount,
        previous: puzzle,
      });
      load2x2Puzzle(next, resetSetStars);
    },
    [dailyIndex, dailyPuzzles, load2x2Puzzle, mode, puzzle, targetSum],
  );

  const handleChangeMode = useCallback(
    (nextMode: GameMode) => {
      if (nextMode === mode) return;
      soundEngine.playTap();
      triggerHaptic("tap");
      setMode(nextMode);

      if (nextMode === "sudoku-4x4") {
        clearTimers();
        setFeedback({ kind: "idle" });
        if (sudokuSolved) {
          startFreshSudoku();
        }
        return;
      }

      if (nextMode === "daily") {
        setDailyIndex(0);
        setDailyFinishedRun(false);
        load2x2Puzzle(dailyPuzzles[0], false);
        return;
      }

      const missingCount = nextMode === "two-blank" ? 2 : 1;
      const next = generatePuzzle({ targetSum, missingCount });
      load2x2Puzzle(next, false);
    },
    [clearTimers, dailyPuzzles, load2x2Puzzle, mode, startFreshSudoku, sudokuSolved, targetSum],
  );

  const handleChangeTargetSum = useCallback(
    (nextTarget: TargetSum) => {
      if (nextTarget === targetSum) return;
      soundEngine.playTap();
      triggerHaptic("tap");
      setProgress((prev) => ({ ...prev, targetSum: nextTarget }));
      if (mode === "classic" || mode === "two-blank") {
        const missingCount = mode === "two-blank" ? 2 : 1;
        const next = generatePuzzle({ targetSum: nextTarget, missingCount });
        load2x2Puzzle(next, false);
      }
    },
    [load2x2Puzzle, mode, targetSum],
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

  const celebrate2x2Win = useCallback(
    (finalSlots: Partial<Record<QuadrantIndex, number>>) => {
      setFilledSlots(finalSlots);
      setWrongGuess(null);
      setWrongSlotIndex(null);
      setSolved(true);

      const nextStreak = streak + 1;
      setStreak(nextStreak);

      const isDaily = mode === "daily";
      const justFinishedDaily = isDaily && dailyIndex === DAILY_SIZE - 1;
      const nextStarsInSet = isDaily ? dailyIndex + 1 : starsInSet + 1;
      const justCompletedSet = !isDaily && nextStarsInSet >= SET_SIZE;

      if (!isDaily) {
        setStarsInSet(nextStarsInSet);
      }

      setProgress((prev) => {
        const prevRewards = getTotalRewardCount(prev);
        const nextDailyDates =
          justFinishedDaily && !prev.dailyCompletedDates.includes(todayKey)
            ? [...prev.dailyCompletedDates, todayKey]
            : prev.dailyCompletedDates;

        const nextProgress: PersistedProgress = {
          ...prev,
          totalSolved: prev.totalSolved + 1,
          bestStreak: Math.max(prev.bestStreak, nextStreak),
          setsCompleted: justCompletedSet ? prev.setsCompleted + 1 : prev.setsCompleted,
          dailyCompletedDates: nextDailyDates,
        };

        const nextRewards = getTotalRewardCount(nextProgress);
        if (nextRewards > prevRewards) {
          showStampToastIfUnlocked(prevRewards, nextRewards);
        }
        return nextProgress;
      });

      const milestone = justFinishedDaily
        ? "Daily 5 complete!"
        : justCompletedSet
          ? "★ 5 stars!"
          : nextStreak > 0 && nextStreak % 5 === 0
            ? `🔥 ${nextStreak} in a row!`
            : null;

      const delayMs =
        justCompletedSet || justFinishedDaily ? AUTO_ADVANCE_MILESTONE_MS : AUTO_ADVANCE_NORMAL_MS;

      setFeedback({
        kind: "solved",
        milestone,
        justCompletedSet: justCompletedSet || justFinishedDaily,
        autoAdvanceMs: delayMs,
      });

      if (justCompletedSet || justFinishedDaily || (nextStreak > 0 && nextStreak % 5 === 0)) {
        soundEngine.playSetComplete();
        triggerHaptic("setComplete");
        fireSetCompleteConfetti();
      } else {
        soundEngine.playCorrect(nextStreak);
        triggerHaptic("correct");
        fireSolvedConfetti(getBoardOrigin());
      }

      autoAdvanceTimerRef.current = window.setTimeout(() => {
        if (justFinishedDaily) {
          setDailyFinishedRun(true);
        } else {
          startNext2x2(justCompletedSet);
        }
      }, delayMs);
    },
    [
      dailyIndex,
      getBoardOrigin,
      mode,
      showStampToastIfUnlocked,
      starsInSet,
      startNext2x2,
      streak,
      todayKey,
    ],
  );

  const handleSelect2x2Number = useCallback(
    (digit: number, explicitSlot?: QuadrantIndex) => {
      if (solved || (mode === "daily" && dailyFinishedRun)) return;

      if (multiDigitTimerRef.current !== null) {
        window.clearTimeout(multiDigitTimerRef.current);
        multiDigitTimerRef.current = null;
        setPendingTypedPrefix("");
      }

      // Single-missing mode (Classic & Daily)
      if (puzzle.missingCount === 1) {
        if (triedWrong.has(digit)) return;
        const evaluation = evaluateGuess(puzzle, digit);

        if (evaluation.status === "correct") {
          if (wrongClearTimerRef.current !== null) {
            window.clearTimeout(wrongClearTimerRef.current);
            wrongClearTimerRef.current = null;
          }
          celebrate2x2Win({ [puzzle.missingIndex]: digit });
        } else {
          soundEngine.playWrong();
          triggerHaptic("wrong");
          setStreak(0);
          setWrongGuess(digit);
          setWrongSlotIndex(puzzle.missingIndex);
          setWrongAttemptKey((k) => k + 1);
          setTriedWrong((prev) => {
            const next = new Set(prev);
            next.add(digit);
            return next;
          });
          setFeedback({ kind: "wrong", message: getWrongFeedback(evaluation) });

          if (wrongClearTimerRef.current !== null) {
            window.clearTimeout(wrongClearTimerRef.current);
          }
          wrongClearTimerRef.current = window.setTimeout(() => {
            setWrongGuess(null);
            setWrongSlotIndex(null);
            wrongClearTimerRef.current = null;
          }, 760);
        }
        return;
      }

      // Open-ended 2-Missing mode!
      const targetSlot =
        explicitSlot !== undefined && puzzle.missingIndices.includes(explicitSlot)
          ? explicitSlot
          : activeSlotIndex;

      const nextFilled: Partial<Record<QuadrantIndex, number>> = {
        ...filledSlots,
        [targetSlot]: digit,
      };

      const otherSlot = puzzle.missingIndices.find((i) => i !== targetSlot)!;

      // Only 1 of the 2 blanks filled so far
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

      // Both blanks filled — evaluate total!
      const evaluation = evaluateMultiGuess(puzzle, nextFilled);
      if (!evaluation) return;

      if (evaluation.status === "correct") {
        celebrate2x2Win(nextFilled);
      } else {
        soundEngine.playWrong();
        triggerHaptic("wrong");
        setStreak(0);
        setWrongGuess(digit);
        setWrongSlotIndex(targetSlot);
        setWrongAttemptKey((k) => k + 1);
        setFeedback({ kind: "wrong", message: getWrongFeedback(evaluation) });

        // Keep the other slot intact, clear the just-placed slot after wobble
        const keptOther: Partial<Record<QuadrantIndex, number>> = {
          [otherSlot]: nextFilled[otherSlot],
        };
        setFilledSlots(keptOther);
        setActiveSlotIndex(targetSlot);

        if (wrongClearTimerRef.current !== null) {
          window.clearTimeout(wrongClearTimerRef.current);
        }
        wrongClearTimerRef.current = window.setTimeout(() => {
          setWrongGuess(null);
          setWrongSlotIndex(null);
          wrongClearTimerRef.current = null;
        }, 760);
      }
    },
    [
      activeSlotIndex,
      celebrate2x2Win,
      dailyFinishedRun,
      filledSlots,
      hintLevel,
      mode,
      puzzle,
      solved,
      triedWrong,
    ],
  );

  const handleSelect2x2Slot = useCallback(
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

  // 4x4 KidSudoku placement logic
  const handlePlaceSudokuDigit = useCallback(
    (digit: number, explicitIndex?: number) => {
      if (sudokuSolved) return;
      const cellIdx = explicitIndex ?? sudokuSelected;
      if (cellIdx === null || sudokuPuzzle.givens[cellIdx] !== null) return;

      const conflict = checkSudokuConflict(sudokuBoard, cellIdx, digit);
      if (conflict) {
        soundEngine.playWrong();
        triggerHaptic("wrong");
        setSudokuConflicts(new Set([cellIdx, ...conflict.conflictingIndices]));
        setSudokuConflictKey((k) => k + 1);
        setFeedback({ kind: "wrong", message: conflict.message });
        if (wrongClearTimerRef.current !== null) {
          window.clearTimeout(wrongClearTimerRef.current);
        }
        wrongClearTimerRef.current = window.setTimeout(() => {
          setSudokuConflicts(new Set());
          wrongClearTimerRef.current = null;
        }, 900);
        return;
      }

      const nextBoard = [...sudokuBoard];
      const boxIdx = getBoxIndex(cellIdx);
      const wasBoxDone = isBoxComplete(sudokuBoard, boxIdx);
      nextBoard[cellIdx] = digit;
      const nowBoxDone = isBoxComplete(nextBoard, boxIdx);

      setSudokuBoard(nextBoard);
      setSudokuConflicts(new Set());

      if (isSudokuSolved(nextBoard)) {
        setSudokuSolved(true);
        setSudokuSelected(null);
        const nextStreak = streak + 1;
        setStreak(nextStreak);

        setProgress((prev) => {
          const prevRewards = getTotalRewardCount(prev);
          const nextProgress: PersistedProgress = {
            ...prev,
            totalSolved: prev.totalSolved + 1,
            bestStreak: Math.max(prev.bestStreak, nextStreak),
            sudoku4x4Solved: prev.sudoku4x4Solved + 1,
          };
          const nextRewards = getTotalRewardCount(nextProgress);
          if (nextRewards > prevRewards) {
            showStampToastIfUnlocked(prevRewards, nextRewards);
          }
          return nextProgress;
        });

        setFeedback({
          kind: "solved",
          milestone: null,
          justCompletedSet: true,
          autoAdvanceMs: null,
        });
        soundEngine.playSetComplete();
        triggerHaptic("setComplete");
        fireSetCompleteConfetti();
        return;
      }

      if (!wasBoxDone && nowBoxDone) {
        soundEngine.playCorrect(1);
        triggerHaptic("correct");
        setFeedback({ kind: "idle" });
      } else {
        soundEngine.playTap();
        triggerHaptic("tap");
        setFeedback({ kind: "idle" });
      }

      // Advance to next empty cell
      const nextEmpty = firstEmptySudokuCell(nextBoard);
      setSudokuSelected(nextEmpty);
    },
    [
      showStampToastIfUnlocked,
      streak,
      sudokuBoard,
      sudokuPuzzle.givens,
      sudokuSelected,
      sudokuSolved,
    ],
  );

  const handleEraseSudokuCell = useCallback(() => {
    if (sudokuSolved || sudokuSelected === null) return;
    if (sudokuPuzzle.givens[sudokuSelected] !== null) return;
    if (sudokuBoard[sudokuSelected] === null) return;

    soundEngine.playTap();
    triggerHaptic("tap");
    setSudokuBoard((prev) => {
      const next = [...prev];
      next[sudokuSelected] = null;
      return next;
    });
    setFeedback({ kind: "idle" });
  }, [sudokuBoard, sudokuPuzzle.givens, sudokuSelected, sudokuSolved]);

  const handleHint = useCallback(() => {
    if (mode === "sudoku-4x4") {
      if (sudokuSolved) return;
      const hint = getSudokuHint(sudokuPuzzle, sudokuBoard);
      if (!hint) return;
      soundEngine.playHint();
      triggerHaptic("tap");
      setSudokuSelected(hint.index);
      handlePlaceSudokuDigit(hint.digit, hint.index);
      return;
    }

    if (solved || hintLevel >= 2 || (mode === "daily" && dailyFinishedRun)) return;
    soundEngine.playHint();
    triggerHaptic("tap");

    if (hintLevel === 0) {
      setHintLevel(1);
    } else if (hintLevel === 1) {
      setHintLevel(2);
      const alreadyFilledSum = Object.values(filledSlots).reduce((acc, v) => acc + (v ?? 0), 0);
      setHintChoices(getHintChoices(puzzle, Math.random, alreadyFilledSum));
    }
  }, [
    dailyFinishedRun,
    filledSlots,
    handlePlaceSudokuDigit,
    hintLevel,
    mode,
    puzzle,
    solved,
    sudokuBoard,
    sudokuPuzzle,
    sudokuSolved,
  ]);

  const handleSkip = useCallback(() => {
    soundEngine.playTap();
    triggerHaptic("tap");
    if (mode === "sudoku-4x4") {
      startFreshSudoku();
    } else {
      startNext2x2(false);
    }
  }, [mode, startFreshSudoku, startNext2x2]);

  const handleToggleSound = useCallback(() => {
    triggerHaptic("tap");
    setProgress((prev) => {
      const nextEnabled = !prev.soundEnabled;
      soundEngine.setEnabled(nextEnabled);
      if (nextEnabled) {
        soundEngine.playTap();
      } else {
        setLogoPlaying(false);
      }
      return { ...prev, soundEnabled: nextEnabled };
    });
  }, []);

  const handleTogglePips = useCallback(() => {
    soundEngine.playTap();
    triggerHaptic("tap");
    setProgress((prev) => ({ ...prev, pipsEnabled: !prev.pipsEnabled }));
  }, []);

  const handleOpenShelf = useCallback(() => {
    soundEngine.playTap();
    triggerHaptic("tap");
    setShelfOpen(true);
    setUnlockedToast(null);
    setProgress((prev) => ({
      ...prev,
      seenRewardCount: getTotalRewardCount(prev),
    }));
  }, []);

  const handleLogoClick = useCallback(() => {
    triggerHaptic("tap");
    setLogoPressCount((c) => c + 1);
    const started = soundEngine.playLogoClip(() => {
      setLogoPlaying(false);
    });
    if (started) {
      setLogoPlaying(true);
    }
  }, []);

  const handleSelectTheme = useCallback((theme: ThemeId) => {
    soundEngine.playTap();
    triggerHaptic("tap");
    setProgress((prev) => ({ ...prev, theme }));
  }, []);

  const handlePinStamp = useCallback((stampId: StampId | null) => {
    soundEngine.playTap();
    triggerHaptic("tap");
    setProgress((prev) => ({ ...prev, pinnedStampId: stampId }));
  }, []);

  // Keyboard support across all modes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (helpOpen || shelfOpen || settingsOpen) {
        if (e.key === "Escape") {
          setHelpOpen(false);
          setShelfOpen(false);
          setSettingsOpen(false);
        }
        return;
      }

      if (e.key === "m" || e.key === "M") {
        handleToggleSound();
        return;
      }
      if (e.key === "h" || e.key === "H") {
        handleHint();
        return;
      }

      if (mode === "sudoku-4x4") {
        if (sudokuSolved) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startFreshSudoku();
          }
          return;
        }
        if (e.key >= "1" && e.key <= "4") {
          handlePlaceSudokuDigit(Number(e.key));
        } else if (e.key === "Backspace" || e.key === "Delete") {
          handleEraseSudokuCell();
        }
        return;
      }

      if (mode === "daily" && dailyFinishedRun) return;

      if (solved) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startNext2x2(starsInSet >= SET_SIZE);
        }
        return;
      }

      if (e.key === "Enter" && pendingTypedPrefix) {
        if (multiDigitTimerRef.current !== null) {
          window.clearTimeout(multiDigitTimerRef.current);
          multiDigitTimerRef.current = null;
        }
        const val = Number(pendingTypedPrefix);
        setPendingTypedPrefix("");
        handleSelect2x2Number(val);
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        const digit = Number(e.key);

        if (pendingTypedPrefix) {
          if (multiDigitTimerRef.current !== null) {
            window.clearTimeout(multiDigitTimerRef.current);
            multiDigitTimerRef.current = null;
          }
          const combined = Number(`${pendingTypedPrefix}${digit}`);
          setPendingTypedPrefix("");
          if (combined <= puzzle.targetSum) {
            handleSelect2x2Number(combined);
          } else {
            handleSelect2x2Number(digit);
          }
          return;
        }

        // Wait briefly for 2-digit entry when needed (e.g. "10" in Make 10, or "10–20" in Make 20)
        const shouldWaitForTwoDigit =
          (puzzle.targetSum === 10 && digit === 1 && puzzle.neededSum >= 10) ||
          (puzzle.targetSum === 20 && (digit === 1 || digit === 2));

        if (shouldWaitForTwoDigit) {
          soundEngine.playTap();
          setPendingTypedPrefix(String(digit));
          multiDigitTimerRef.current = window.setTimeout(() => {
            setPendingTypedPrefix("");
            multiDigitTimerRef.current = null;
            handleSelect2x2Number(digit);
          }, 680);
          return;
        }

        if (digit <= puzzle.targetSum) {
          handleSelect2x2Number(digit);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    dailyFinishedRun,
    handleEraseSudokuCell,
    handleHint,
    handlePlaceSudokuDigit,
    handleSelect2x2Number,
    handleToggleSound,
    helpOpen,
    mode,
    pendingTypedPrefix,
    puzzle.neededSum,
    puzzle.targetSum,
    settingsOpen,
    shelfOpen,
    solved,
    starsInSet,
    startFreshSudoku,
    startNext2x2,
    sudokuSolved,
  ]);

  const completedNumbers = puzzle.cells.map((c, idx) =>
    c === null ? (filledSlots[idx as QuadrantIndex] ?? puzzle.answer) : c,
  );

  const activeDigits =
    mode === "sudoku-4x4"
      ? DIGITS_SUDOKU
      : puzzle.targetSum === 5
        ? DIGITS_5
        : puzzle.targetSum === 20
          ? DIGITS_20
          : DIGITS_10;

  const winningDigits = useMemo(() => {
    if (!solved) return undefined;
    const set = new Set<number>();
    for (const idx of puzzle.missingIndices) {
      const val = filledSlots[idx] ?? puzzle.answer;
      set.add(val);
    }
    return set;
  }, [filledSlots, puzzle.answer, puzzle.missingIndices, solved]);

  const isDailyCompleteCard = mode === "daily" && dailyFinishedRun;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh safe-shell flex flex-col justify-between">
        <Header
          totalSolved={progress.totalSolved}
          streak={streak}
          bestStreak={progress.bestStreak}
          soundEnabled={progress.soundEnabled}
          logoPlaying={logoPlaying}
          logoPressCount={logoPressCount}
          hasUnseenReward={hasUnseenReward}
          onLogoClick={handleLogoClick}
          onOpenShelf={handleOpenShelf}
          onToggleSound={handleToggleSound}
          onOpenSettings={() => {
            soundEngine.playTap();
            triggerHaptic("tap");
            setSettingsOpen(true);
          }}
          onOpenHelp={() => {
            soundEngine.playTap();
            triggerHaptic("tap");
            setHelpOpen(true);
          }}
        />

        {/* Mode Switcher */}
        <div className="w-full flex justify-center px-3 pt-1 pb-1">
          <ModeBar
            mode={mode}
            onChangeMode={handleChangeMode}
            dailyCompletedToday={dailyCompletedToday}
          />
        </div>

        {/* Stamp unlock toast */}
        <AnimatePresence>
          {unlockedToast && (
            <motion.button
              type="button"
              onClick={handleOpenShelf}
              initial={{ opacity: 0, y: -16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.94 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-full cs-surface border border-amber-warm shadow-[0_12px_28px_-8px_rgba(0,0,0,0.28)] cursor-pointer"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: unlockedToast.wash,
                  color: unlockedToast.accent,
                }}
              >
                <StampIcon id={unlockedToast.id} className="w-5 h-5" />
              </span>
              <span className="text-xs sm:text-sm font-bold text-ink">
                New stamp unlocked:{" "}
                <strong className="text-amber-deep">{unlockedToast.name}</strong>!
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Daily Challenge Complete Summary Card */}
        {isDailyCompleteCard ? (
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
                  onClick={() => handleChangeMode("classic")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl next-cta text-white font-display text-base font-semibold [@media(hover:hover)]:hover:brightness-105 cursor-pointer"
                >
                  Play Free 2×2
                </button>
                <button
                  type="button"
                  onClick={handleOpenShelf}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl cs-pill border text-ink font-bold text-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-warm" />
                  <span>View Stamp Shelf</span>
                </button>
              </div>
            </motion.div>
          </main>
        ) : (
          <main className="flex-1 w-full max-w-xl mx-auto px-3 sm:px-4 flex flex-col items-center justify-center gap-2.5 sm:gap-3 py-1 [@media(orientation:landscape)_and_(max-height:520px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:520px)]:grid [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[auto_1fr] [@media(orientation:landscape)_and_(max-height:520px)]:items-center [@media(orientation:landscape)_and_(max-height:520px)]:gap-5">
            {/* Left column in mobile landscape: Board */}
            <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
              {mode === "sudoku-4x4" ? (
                <Sudoku4x4Board
                  puzzle={sudokuPuzzle}
                  board={sudokuBoard}
                  selectedIndex={sudokuSelected}
                  onSelectCell={(idx) => {
                    soundEngine.playTap();
                    triggerHaptic("tap");
                    setSudokuSelected(idx);
                    setFeedback({ kind: "idle" });
                  }}
                  conflictIndices={sudokuConflicts}
                  conflictKey={sudokuConflictKey}
                  hoveredDropIndex={hoveredDropIndex}
                  solved={sudokuSolved}
                  boardRef={boardRef}
                />
              ) : (
                <PuzzleBoard
                  puzzle={puzzle}
                  solved={solved}
                  filledSlots={filledSlots}
                  activeSlotIndex={activeSlotIndex}
                  onSelectSlot={handleSelect2x2Slot}
                  wrongGuess={wrongGuess}
                  wrongSlotIndex={wrongSlotIndex}
                  wrongAttemptKey={wrongAttemptKey}
                  hintLevel={hintLevel}
                  pipsEnabled={progress.pipsEnabled}
                  pendingTypedPrefix={pendingTypedPrefix}
                  hoveredDropIndex={hoveredDropIndex}
                  boardRef={boardRef}
                />
              )}
            </div>

            {/* Right column in mobile landscape: Feedback + TenFrame + NumberPad + Actions */}
            <div className="w-full flex flex-col items-center gap-2.5 sm:gap-3">
              {/* Stable-height Feedback / Standalone Equation Slot */}
              <div className="w-full max-w-md min-h-[42px] sm:min-h-[46px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {feedback.kind === "solved" ? (
                    <motion.div
                      key={`solved-eq-${mode === "sudoku-4x4" ? sudokuPuzzle.id : puzzle.id}`}
                      initial={{ opacity: 0, y: 6, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.1 } }}
                      transition={{ type: "spring", stiffness: 460, damping: 24 }}
                      role="status"
                      aria-live="polite"
                      className="flex items-center justify-center"
                    >
                      {mode === "sudoku-4x4" ? (
                        <span className="font-display text-xl sm:text-2xl font-bold text-sage-deep inline-flex items-center gap-1.5">
                          <Sparkles className="w-5 h-5 text-sage" />
                          <span>Every box makes 10!</span>
                        </span>
                      ) : (
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
                      )}
                    </motion.div>
                  ) : feedback.kind === "wrong" ? (
                    <motion.div
                      key={`wrong-${wrongAttemptKey}-${sudokuConflictKey}`}
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
                      key={`idle-${mode}-${hintLevel}-${puzzle.targetSum}-${dailyIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.08 } }}
                      className="text-xs sm:text-sm font-semibold text-ink-soft text-center"
                    >
                      {mode === "sudoku-4x4" ? (
                        "Tap or drag 1–4 into any open square"
                      ) : hintLevel === 2 ? (
                        <span>
                          Highlighted <strong className="text-amber-deep">3 choices</strong> below —
                          which one makes {puzzle.targetSum}?
                        </span>
                      ) : mode === "two-blank" ? (
                        `Make ${puzzle.targetSum} with any pair — tap or drag!`
                      ) : mode === "daily" ? (
                        `Daily ${dailyIndex + 1}/${DAILY_SIZE} · Make ${puzzle.targetSum} — tap or drag a number`
                      ) : (
                        `Make ${puzzle.targetSum} — tap or drag into the glowing square`
                      )}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Expandable Five / Ten / Double-Ten Frame Visual Hint */}
              <AnimatePresence>
                {mode !== "sudoku-4x4" && hintLevel >= 1 && (
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
                onSelect={(digit) => {
                  if (mode === "sudoku-4x4") {
                    handlePlaceSudokuDigit(digit);
                  } else {
                    handleSelect2x2Number(digit);
                  }
                }}
                onDropOnTarget={(digit, targetIdx) => {
                  if (mode === "sudoku-4x4") {
                    setSudokuSelected(targetIdx);
                    handlePlaceSudokuDigit(digit, targetIdx);
                  } else {
                    handleSelect2x2Number(digit, targetIdx as QuadrantIndex);
                  }
                }}
                onHoverDropTarget={setHoveredDropIndex}
                dropAttribute={mode === "sudoku-4x4" ? "data-drop-sudoku" : "data-drop-quadrant"}
                triedWrong={mode === "sudoku-4x4" ? undefined : triedWrong}
                solved={mode === "sudoku-4x4" ? sudokuSolved : solved}
                winningDigits={mode === "sudoku-4x4" ? undefined : winningDigits}
                hintChoices={mode === "sudoku-4x4" ? null : hintChoices}
                showErase={mode === "sudoku-4x4"}
                onErase={handleEraseSudokuCell}
              />

              {/* Secondary actions — subtler & separated below the number pad; swaps cleanly into Next CTA while solved */}
              <div className="min-h-[42px] flex items-center justify-center mt-4 sm:mt-5 [@media(max-height:700px)]:mt-2 [@media(orientation:landscape)_and_(max-height:520px)]:mt-1">
                <AnimatePresence mode="wait">
                  {feedback.kind === "solved" ? (
                    <motion.div
                      key={`solved-actions-${mode === "sudoku-4x4" ? sudokuPuzzle.id : puzzle.id}`}
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
                        onClick={() =>
                          mode === "sudoku-4x4"
                            ? startFreshSudoku()
                            : startNext2x2(feedback.justCompletedSet)
                        }
                        className="next-cta relative overflow-hidden inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-white text-sm font-extrabold [@media(hover:hover)]:hover:brightness-105 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
                      >
                        {feedback.autoAdvanceMs !== null && (
                          <span
                            aria-hidden="true"
                            className="next-progress-fill pointer-events-none absolute inset-0 bg-white/22"
                            style={{ animationDuration: `${feedback.autoAdvanceMs}ms` }}
                          />
                        )}
                        <span className="relative z-10 inline-flex items-center gap-1.5">
                          <span>
                            {mode === "sudoku-4x4"
                              ? "New Board"
                              : mode === "daily" && dailyIndex === DAILY_SIZE - 1
                                ? "Finish"
                                : "Next"}
                          </span>
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
                        disabled={mode === "sudoku-4x4" ? sudokuSolved : solved || hintLevel >= 2}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
                          (mode === "sudoku-4x4" ? sudokuSolved : solved || hintLevel >= 2)
                            ? "cs-subtle-btn-disabled cursor-default"
                            : mode !== "sudoku-4x4" && hintLevel === 1
                              ? "cs-subtle-btn-active cursor-pointer"
                              : "cs-subtle-btn cursor-pointer"
                        }`}
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>
                          {mode === "sudoku-4x4"
                            ? "Hint"
                            : hintLevel === 0
                              ? "Hint"
                              : hintLevel === 1
                                ? "Narrow choices"
                                : "Hint shown"}
                        </span>
                      </button>

                      {mode !== "sudoku-4x4" && (
                        <button
                          type="button"
                          onClick={handleTogglePips}
                          aria-pressed={progress.pipsEnabled}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
                            progress.pipsEnabled ? "cs-subtle-btn-active" : "cs-subtle-btn"
                          }`}
                        >
                          <Grip className="w-3.5 h-3.5" />
                          <span>Dots</span>
                        </button>
                      )}

                      {mode !== "daily" && (
                        <button
                          type="button"
                          onClick={handleSkip}
                          aria-label={mode === "sudoku-4x4" ? "New 4 by 4 board" : "New square"}
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
        )}

        <StampShelfModal
          open={shelfOpen}
          onClose={() => setShelfOpen(false)}
          totalSolved={progress.totalSolved}
          rewardCount={rewardCount}
          activeTheme={progress.theme}
          onSelectTheme={handleSelectTheme}
          pinnedStampId={progress.pinnedStampId}
          onPinStamp={handlePinStamp}
        />

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          mode={mode}
          targetSum={targetSum}
          onChangeTargetSum={handleChangeTargetSum}
          starsInSet={mode === "daily" ? dailyIndex + (solved ? 1 : 0) : starsInSet}
          setsCompleted={progress.setsCompleted}
          pinnedStampId={progress.pinnedStampId}
          dailyLabel={
            mode === "daily"
              ? `Daily · ${Math.min(dailyIndex + 1, DAILY_SIZE)}/${DAILY_SIZE}`
              : null
          }
          onOpenShelf={() => {
            setSettingsOpen(false);
            handleOpenShelf();
          }}
        />

        <HowToPlayModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </MotionConfig>
  );
}
