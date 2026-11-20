import { type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { TARGET_SUM, type Puzzle } from "../game/puzzle";
import { HINT_GROUP_STYLES } from "./TenFrameHint";

interface PuzzleBoardProps {
  puzzle: Puzzle;
  solved: boolean;
  wrongGuess: number | null;
  wrongAttemptKey: number;
  hintLevel: number;
  pendingTensDigit: boolean;
  boardRef: RefObject<HTMLDivElement | null>;
}

export function PuzzleBoard({
  puzzle,
  solved,
  wrongGuess,
  wrongAttemptKey,
  hintLevel,
  pendingTensDigit,
  boardRef,
}: PuzzleBoardProps) {
  // Map quadrant index -> hint group color index (0, 1, 2)
  const hintGroupByQuadrant = new Map<number, number>();
  puzzle.givenEntries.forEach((entry, idx) => {
    hintGroupByQuadrant.set(entry.index, idx);
  });

  return (
    <div className="w-full flex flex-col items-center">
      {/* Subtle rule chip */}
      <div className="mb-2.5 flex items-center gap-2">
        <motion.div
          animate={solved ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold border transition-colors duration-200 ${
            solved
              ? "bg-sage-wash border-[#a9d9c3] text-sage-deep"
              : "bg-cream/90 border-[#e4dac6] text-ink-soft"
          }`}
        >
          {solved ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-sage" />
              <span>Sum equals {TARGET_SUM}!</span>
            </>
          ) : (
            <>
              <span>All 4 squares add up to</span>
              <span className="font-display text-sm sm:text-base font-bold text-ink bg-[#f4ebda] px-2 py-0.5 rounded-full">
                {TARGET_SUM}
              </span>
            </>
          )}
        </motion.div>
      </div>

      {/* 2x2 Tactile Square Tray */}
      <div
        ref={boardRef}
        className={`relative board-tray p-3 sm:p-3.5 rounded-[26px] border transition-colors duration-300 w-[clamp(216px,64vw,276px)] h-[clamp(216px,64vw,276px)] [@media(max-height:700px)]:w-[214px] [@media(max-height:700px)]:h-[214px] [@media(orientation:landscape)_and_(max-height:520px)]:w-[200px] [@media(orientation:landscape)_and_(max-height:520px)]:h-[200px] ${
          solved ? "border-[#a7d8c1] ring-4 ring-sage/15" : "border-[#dfd3bd]"
        }`}
        role="grid"
        aria-label="2 by 2 KidSudoku puzzle square"
      >
        {/* Subtle cross-hair dividers */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 flex items-center justify-center"
        >
          <div className="w-full h-[2px] bg-[#dfd3be]/60 rounded-full" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 flex items-center justify-center"
        >
          <div className="h-full w-[2px] bg-[#dfd3be]/60 rounded-full" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={puzzle.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 w-full h-full"
          >
            {puzzle.cells.map((value, index) => {
              const isMissing = value === null;
              const groupIdx = hintGroupByQuadrant.get(index);
              const hintStyle =
                hintLevel >= 1 && groupIdx !== undefined
                  ? HINT_GROUP_STYLES[groupIdx % HINT_GROUP_STYLES.length]
                  : null;

              if (!isMissing) {
                return (
                  <motion.div
                    key={`${puzzle.id}-cell-${index}`}
                    role="gridcell"
                    aria-label={`Quadrant ${index + 1}: ${value}`}
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={
                      solved
                        ? {
                            opacity: 1,
                            scale: 1,
                            y: [0, -6, 0],
                          }
                        : { opacity: 1, scale: 1, y: 0 }
                    }
                    transition={
                      solved
                        ? {
                            duration: 0.42,
                            delay: index * 0.055,
                            ease: "easeInOut",
                          }
                        : {
                            type: "spring",
                            stiffness: 420,
                            damping: 24,
                            delay: index * 0.045,
                          }
                    }
                    className={`relative rounded-[20px] tile-given border flex items-center justify-center select-none transition-colors duration-200 ${
                      solved
                        ? "border-[#b8dfcd]"
                        : hintStyle
                          ? `border-[#e5dac6] ring-2 ${hintStyle.ring}`
                          : "border-[#eae1cf]"
                    }`}
                  >
                    {hintStyle && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        aria-hidden="true"
                        className={`absolute top-2.5 left-2.5 w-3 h-3 rounded-full ${hintStyle.dot} shadow-xs`}
                      />
                    )}
                    <span className="font-display text-5xl sm:text-[56px] font-bold text-ink leading-none">
                      {value}
                    </span>
                  </motion.div>
                );
              }

              // Missing quadrant (either awaiting answer, wrong preview wobble, or solved!)
              const showingWrong = !solved && wrongGuess !== null;

              return (
                <motion.div
                  key={`${puzzle.id}-missing-${wrongAttemptKey}`}
                  role="gridcell"
                  aria-label={
                    solved
                      ? `Quadrant ${index + 1}: solved with ${puzzle.answer}`
                      : `Quadrant ${index + 1}: missing number`
                  }
                  initial={showingWrong ? { x: 0 } : { opacity: 0, scale: 0.86, y: 8 }}
                  animate={
                    solved
                      ? {
                          opacity: 1,
                          scale: [0.82, 1.09, 1],
                          y: 0,
                        }
                      : showingWrong
                        ? {
                            x: [0, -9, 9, -6, 6, -2, 0],
                          }
                        : { opacity: 1, scale: 1, y: 0 }
                  }
                  transition={
                    solved
                      ? { type: "spring", stiffness: 460, damping: 16 }
                      : showingWrong
                        ? { duration: 0.42, ease: "easeInOut" }
                        : {
                            type: "spring",
                            stiffness: 400,
                            damping: 24,
                            delay: index * 0.045,
                          }
                  }
                  className={`relative rounded-[20px] flex items-center justify-center select-none transition-colors duration-200 ${
                    solved
                      ? "tile-solved border-2 border-sage"
                      : showingWrong
                        ? "tile-wrong border-2 border-coral"
                        : "tile-missing border-2 border-dashed border-amber-warm"
                  }`}
                >
                  {solved ? (
                    <>
                      <motion.span
                        initial={{ scale: 0, rotate: -25 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 18,
                          delay: 0.08,
                        }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sage text-white flex items-center justify-center shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </motion.span>
                      <span className="font-display text-5xl sm:text-[56px] font-bold text-sage-deep leading-none">
                        {puzzle.answer}
                      </span>
                    </>
                  ) : showingWrong ? (
                    <span className="font-display text-5xl sm:text-[56px] font-bold text-coral-deep leading-none">
                      {wrongGuess}
                    </span>
                  ) : pendingTensDigit ? (
                    <span className="font-display text-4xl sm:text-5xl font-bold text-amber-deep leading-none">
                      1<span className="animate-pulse opacity-60">_</span>
                    </span>
                  ) : (
                    <motion.span
                      animate={{ y: [0, -3, 0] }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="font-display text-5xl sm:text-[56px] font-bold text-amber-warm leading-none"
                    >
                      ?
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
