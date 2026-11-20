import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowRight, Lightbulb, RefreshCw } from 'lucide-react';
import {
  SET_SIZE,
  TARGET_SUM,
  evaluateGuess,
  generatePuzzle,
  getCelebrationMessage,
  getHintChoices,
  getWrongFeedback,
  type Puzzle,
} from './game/puzzle';
import { soundEngine, triggerHaptic } from './game/sound';
import { fireSetCompleteConfetti, fireSolvedConfetti } from './game/confetti';
import { loadProgress, saveProgress, type PersistedProgress } from './game/storage';
import { Header } from './components/Header';
import { StarTrack } from './components/StarTrack';
import { PuzzleBoard } from './components/PuzzleBoard';
import { TenFrameHint } from './components/TenFrameHint';
import { NumberPad } from './components/NumberPad';
import { HowToPlayModal } from './components/HowToPlayModal';

type FeedbackState =
  | { kind: 'idle' }
  | { kind: 'wrong'; message: string }
  | { kind: 'solved'; message: string; justCompletedSet: boolean };

export default function App() {
  const [progress, setProgress] = useState<PersistedProgress>(() => {
    const loaded = loadProgress();
    soundEngine.setEnabled(loaded.soundEnabled);
    return loaded;
  });

  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle());
  const [solved, setSolved] = useState(false);
  const [streak, setStreak] = useState(0);
  const [starsInSet, setStarsInSet] = useState(0);
  const [attemptsThisRound, setAttemptsThisRound] = useState(0);
  const [triedWrong, setTriedWrong] = useState<Set<number>>(() => new Set());
  const [wrongGuess, setWrongGuess] = useState<number | null>(null);
  const [wrongAttemptKey, setWrongAttemptKey] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: 'idle' });
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [hintChoices, setHintChoices] = useState<number[] | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingTensDigit, setPendingTensDigit] = useState(false);
  const [logoPlaying, setLogoPlaying] = useState(false);
  const [logoPressCount, setLogoPressCount] = useState(0);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const wrongClearTimerRef = useRef<number | null>(null);
  const tensTimerRef = useRef<number | null>(null);

  // Sync persisted progress
  useEffect(() => {
    saveProgress(progress);
    soundEngine.setEnabled(progress.soundEnabled);
  }, [progress]);

  // Unlock iOS Safari AudioContext & pre-decode logo clip on first user touch/click
  useEffect(() => {
    const unlockOnce = () => {
      soundEngine.unlock();
      window.removeEventListener('pointerdown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    return () => window.removeEventListener('pointerdown', unlockOnce);
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
    if (tensTimerRef.current !== null) {
      window.clearTimeout(tensTimerRef.current);
      tensTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const startNextPuzzle = useCallback(
    (resetSetStars = false) => {
      clearTimers();
      setPuzzle((prev) => generatePuzzle(prev));
      setSolved(false);
      setAttemptsThisRound(0);
      setTriedWrong(new Set());
      setWrongGuess(null);
      setFeedback({ kind: 'idle' });
      setHintLevel(0);
      setHintChoices(null);
      setPendingTensDigit(false);
      if (resetSetStars) {
        setStarsInSet(0);
      }
    },
    [clearTimers],
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

  const handleSelectNumber = useCallback(
    (digit: number) => {
      if (solved) return;
      if (triedWrong.has(digit)) return;

      if (tensTimerRef.current !== null) {
        window.clearTimeout(tensTimerRef.current);
        tensTimerRef.current = null;
        setPendingTensDigit(false);
      }

      const evaluation = evaluateGuess(puzzle, digit);
      const nextAttempts = attemptsThisRound + 1;
      setAttemptsThisRound(nextAttempts);

      if (evaluation.status === 'correct') {
        if (wrongClearTimerRef.current !== null) {
          window.clearTimeout(wrongClearTimerRef.current);
          wrongClearTimerRef.current = null;
        }
        setWrongGuess(null);
        setSolved(true);

        const nextStreak = streak + 1;
        setStreak(nextStreak);

        const nextStarsInSet = starsInSet + 1;
        const justCompletedSet = nextStarsInSet >= SET_SIZE;
        setStarsInSet(nextStarsInSet);

        setProgress((prev) => ({
          ...prev,
          totalSolved: prev.totalSolved + 1,
          bestStreak: Math.max(prev.bestStreak, nextStreak),
          setsCompleted: justCompletedSet
            ? prev.setsCompleted + 1
            : prev.setsCompleted,
        }));

        const message = getCelebrationMessage(
          nextStreak,
          nextAttempts,
          justCompletedSet,
        );
        setFeedback({ kind: 'solved', message, justCompletedSet });

        if (justCompletedSet || (nextStreak > 0 && nextStreak % 5 === 0)) {
          soundEngine.playSetComplete();
          triggerHaptic('setComplete');
          fireSetCompleteConfetti();
        } else {
          soundEngine.playCorrect(nextStreak);
          triggerHaptic('correct');
          fireSolvedConfetti(getBoardOrigin());
        }

        const delayMs = justCompletedSet ? 2300 : 1600;
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          startNextPuzzle(justCompletedSet);
        }, delayMs);
      } else {
        soundEngine.playWrong();
        triggerHaptic('wrong');
        setStreak(0);
        setWrongGuess(digit);
        setWrongAttemptKey((k) => k + 1);
        setTriedWrong((prev) => {
          const next = new Set(prev);
          next.add(digit);
          return next;
        });
        setFeedback({ kind: 'wrong', message: getWrongFeedback(evaluation) });

        if (wrongClearTimerRef.current !== null) {
          window.clearTimeout(wrongClearTimerRef.current);
        }
        wrongClearTimerRef.current = window.setTimeout(() => {
          setWrongGuess(null);
          wrongClearTimerRef.current = null;
        }, 760);
      }
    },
    [
      attemptsThisRound,
      getBoardOrigin,
      puzzle,
      solved,
      starsInSet,
      startNextPuzzle,
      streak,
      triedWrong,
    ],
  );

  const handleHint = useCallback(() => {
    if (solved || hintLevel >= 2) return;
    soundEngine.playHint();
    triggerHaptic('tap');

    if (hintLevel === 0) {
      setHintLevel(1);
    } else if (hintLevel === 1) {
      setHintLevel(2);
      setHintChoices(getHintChoices(puzzle));
    }
  }, [hintLevel, puzzle, solved]);

  const handleSkip = useCallback(() => {
    soundEngine.playTap();
    triggerHaptic('tap');
    startNextPuzzle(false);
  }, [startNextPuzzle]);

  const handleToggleSound = useCallback(() => {
    triggerHaptic('tap');
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

  const handleLogoClick = useCallback(() => {
    triggerHaptic('tap');
    setLogoPressCount((c) => c + 1);
    const started = soundEngine.playLogoClip(() => {
      setLogoPlaying(false);
    });
    if (started) {
      setLogoPlaying(true);
    }
  }, []);

  // Keyboard support (0-9, smart "10" typing, H for hint, M for mute, Enter/Space for next)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (helpOpen) {
        if (e.key === 'Escape') {
          setHelpOpen(false);
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        handleToggleSound();
        return;
      }

      if (e.key === 'h' || e.key === 'H') {
        handleHint();
        return;
      }

      if (solved) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startNextPuzzle(starsInSet >= SET_SIZE);
        }
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        const digit = Number(e.key);

        if (pendingTensDigit) {
          if (tensTimerRef.current !== null) {
            window.clearTimeout(tensTimerRef.current);
            tensTimerRef.current = null;
          }
          setPendingTensDigit(false);
          if (digit === 0) {
            handleSelectNumber(10);
            return;
          }
          handleSelectNumber(digit);
          return;
        }

        // If the answer is 10, briefly wait after pressing "1" so the player can type "10"
        if (digit === 1 && puzzle.answer === 10) {
          soundEngine.playTap();
          setPendingTensDigit(true);
          tensTimerRef.current = window.setTimeout(() => {
            setPendingTensDigit(false);
            tensTimerRef.current = null;
            handleSelectNumber(1);
          }, 700);
          return;
        }

        handleSelectNumber(digit);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleHint,
    handleSelectNumber,
    handleToggleSound,
    helpOpen,
    pendingTensDigit,
    puzzle.answer,
    solved,
    starsInSet,
    startNextPuzzle,
  ]);

  const completedNumbers = puzzle.cells.map((c) =>
    c === null ? puzzle.answer : c,
  );

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
          onLogoClick={handleLogoClick}
          onToggleSound={handleToggleSound}
          onOpenHelp={() => {
            soundEngine.playTap();
            triggerHaptic('tap');
            setHelpOpen(true);
          }}
        />

        <main className="flex-1 w-full max-w-xl mx-auto px-3 sm:px-4 flex flex-col items-center justify-center gap-2.5 sm:gap-3.5 py-1 [@media(orientation:landscape)_and_(max-height:520px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:520px)]:grid [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-[auto_1fr] [@media(orientation:landscape)_and_(max-height:520px)]:items-center [@media(orientation:landscape)_and_(max-height:520px)]:gap-5">
          {/* Left column in mobile landscape: StarTrack + 2x2 Board */}
          <div className="w-full flex flex-col items-center gap-2.5 sm:gap-3">
            <StarTrack
              starsInSet={starsInSet}
              setsCompleted={progress.setsCompleted}
            />

            <PuzzleBoard
              puzzle={puzzle}
              solved={solved}
              wrongGuess={wrongGuess}
              wrongAttemptKey={wrongAttemptKey}
              hintLevel={hintLevel}
              pendingTensDigit={pendingTensDigit}
              boardRef={boardRef}
            />
          </div>

          {/* Right column in mobile landscape: Feedback + TenFrame + NumberPad + Actions */}
          <div className="w-full flex flex-col items-center gap-2.5 sm:gap-3.5">
            {/* Stable-height Feedback / Equation Bar */}
            <div className="w-full max-w-md min-h-[38px] sm:min-h-[42px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {feedback.kind === 'solved' ? (
                  <motion.div
                    key={`solved-${puzzle.id}`}
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={{ type: 'spring', stiffness: 460, damping: 24 }}
                    className="flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-2xl bg-sage-wash border border-[#b2dec9] text-sage-deep shadow-xs"
                  >
                    <span className="font-display text-sm sm:text-base font-bold">
                      {completedNumbers.map((n, idx) => (
                        <span key={idx}>
                          {idx > 0 && (
                            <span className="mx-1 opacity-55 font-sans font-bold">
                              +
                            </span>
                          )}
                          <span
                            className={
                              idx === puzzle.missingIndex
                                ? 'inline-block px-1.5 py-0.5 rounded-md bg-sage text-white leading-none'
                                : ''
                            }
                          >
                            {n}
                          </span>
                        </span>
                      ))}
                      <span className="mx-1.5 opacity-60">=</span>
                      <span>{TARGET_SUM}</span>
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-sage-deep/90">
                      · {feedback.message}
                    </span>
                    <button
                      type="button"
                      onClick={() => startNextPuzzle(feedback.justCompletedSet)}
                      className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sage text-white text-xs font-bold [@media(hover:hover)]:hover:brightness-105 active:scale-95 transition cursor-pointer"
                    >
                      Next
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </motion.div>
                ) : feedback.kind === 'wrong' ? (
                  <motion.div
                    key={`wrong-${wrongAttemptKey}`}
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    transition={{ duration: 0.14 }}
                    role="status"
                    aria-live="polite"
                    className="px-3.5 py-1.5 rounded-2xl bg-coral-wash border border-[#f2c3b5] text-coral-deep text-xs sm:text-sm font-bold text-center"
                  >
                    {feedback.message}
                  </motion.div>
                ) : (
                  <motion.p
                    key="idle-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    className="text-xs sm:text-sm font-semibold text-ink-soft text-center"
                  >
                    {hintLevel === 2 ? (
                      <span>
                        Highlighted{' '}
                        <strong className="text-amber-deep">3 choices</strong>{' '}
                        below — which one makes 10?
                      </span>
                    ) : (
                      'Tap the number that belongs in the glowing square'
                    )}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Expandable Ten-Frame Visual Hint */}
            <AnimatePresence>
              {hintLevel >= 1 && (
                <TenFrameHint
                  puzzle={puzzle}
                  hintLevel={hintLevel}
                  solved={solved}
                />
              )}
            </AnimatePresence>

            {/* 0–10 Tactile Number Pad */}
            <NumberPad
              onSelect={handleSelectNumber}
              triedWrong={triedWrong}
              solved={solved}
              answer={puzzle.answer}
              hintChoices={hintChoices}
            />

            {/* Secondary actions: Hint + New Square */}
            <div className="flex items-center justify-center gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={handleHint}
                disabled={solved || hintLevel >= 2}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
                  solved || hintLevel >= 2
                    ? 'bg-[#f4eee2] border-[#e6decb] text-[#b4a996] cursor-default'
                    : hintLevel === 1
                      ? 'bg-amber-wash border-[#ecc270] text-amber-deep shadow-[0_2px_0_#e4be73] [@media(hover:hover)]:hover:brightness-98 active:translate-y-[1px]'
                      : 'bg-cream border-[#e5dac6] text-ink-soft shadow-[0_2px_0_#e1d6c1] [@media(hover:hover)]:hover:text-ink [@media(hover:hover)]:hover:bg-[#fffaf0] active:translate-y-[1px]'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                <span>
                  {hintLevel === 0
                    ? 'Hint'
                    : hintLevel === 1
                      ? 'Narrow choices'
                      : 'Hint shown'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-cream border border-[#e5dac6] text-ink-soft shadow-[0_2px_0_#e1d6c1] [@media(hover:hover)]:hover:text-ink [@media(hover:hover)]:hover:bg-[#fffaf0] active:translate-y-[1px] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Square</span>
              </button>
            </div>
          </div>
        </main>

        <HowToPlayModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </MotionConfig>
  );
}
