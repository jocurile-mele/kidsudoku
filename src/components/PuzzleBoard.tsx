import { type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import type { Puzzle, QuadrantIndex } from "../game/puzzle";
import { HINT_GROUP_STYLES } from "./TenFrameHint";
import { DominoPips } from "./DominoPips";

interface PuzzleBoardProps {
  puzzle: Puzzle;
  solved: boolean;
  filledSlots: Partial<Record<QuadrantIndex, number>>;
  activeSlotIndex: QuadrantIndex;
  onSelectSlot: (index: QuadrantIndex) => void;
  wrongGuess: number | null;
  wrongSlotIndex: QuadrantIndex | null;
  wrongAttemptKey: number;
  hintLevel: number;
  pipsEnabled: boolean;
  pendingTypedPrefix: string;
  hoveredDropIndex: number | null;
  boardRef: RefObject<HTMLDivElement | null>;
}

export function PuzzleBoard({
  puzzle,
  solved,
  filledSlots,
  activeSlotIndex,
  onSelectSlot,
  wrongGuess,
  wrongSlotIndex,
  wrongAttemptKey,
  hintLevel,
  pipsEnabled,
  pendingTypedPrefix,
  hoveredDropIndex,
  boardRef,
}: PuzzleBoardProps) {
  const hintGroupByQuadrant = new Map<number, number>();
  puzzle.givenEntries.forEach((entry, idx) => {
    hintGroupByQuadrant.set(entry.index, idx);
  });

  return (
    <div className="w-full flex flex-col items-center">
      {/* 2x2 Tactile Square Tray */}
      <div
        ref={boardRef}
        className={`relative board-tray p-3 sm:p-3.5 rounded-[26px] border transition-colors duration-300 w-[clamp(216px,64vw,276px)] h-[clamp(216px,64vw,276px)] [@media(max-height:700px)]:w-[214px] [@media(max-height:700px)]:h-[214px] [@media(orientation:landscape)_and_(max-height:520px)]:w-[196px] [@media(orientation:landscape)_and_(max-height:520px)]:h-[196px] ${
          solved ? "border-sage/70 ring-4 ring-sage/15" : ""
        }`}
        role="grid"
        aria-label={`2 by 2 KidSudoku square summing to ${puzzle.targetSum}`}
      >
        {/* Subtle cross-hair dividers */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 flex items-center justify-center"
        >
          <div
            className="w-full h-[2px] rounded-full"
            style={{ backgroundColor: "var(--cs-divider)" }}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-4 flex items-center justify-center"
        >
          <div
            className="h-full w-[2px] rounded-full"
            style={{ backgroundColor: "var(--cs-divider)" }}
          />
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
            {puzzle.cells.map((value, rawIndex) => {
              const index = rawIndex as QuadrantIndex;
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
                        ? { opacity: 1, scale: 1, y: [0, -6, 0] }
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
                    className={`relative rounded-[20px] tile-given border flex flex-col items-center justify-center gap-1 select-none transition-colors duration-200 ${
                      solved
                        ? "border-sage/60"
                        : hintStyle
                          ? `border-[var(--cs-border)] ring-2 ${hintStyle.ring}`
                          : "border-[var(--cs-border)]"
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
                    <span
                      className={`font-display font-bold text-ink leading-none ${
                        pipsEnabled
                          ? "text-4xl sm:text-[42px]"
                          : value >= 10
                            ? "text-4xl sm:text-5xl"
                            : "text-5xl sm:text-[54px]"
                      }`}
                    >
                      {value}
                    </span>
                    {pipsEnabled && (
                      <DominoPips
                        value={value}
                        colorClass={hintStyle ? hintStyle.dot : "bg-ink/40"}
                      />
                    )}
                  </motion.div>
                );
              }

              // Missing quadrant (supports 1-missing & 2-missing & drag-drop highlight)
              const placedValue = filledSlots[index];
              const isActive = !solved && activeSlotIndex === index;
              const isDropHover = !solved && hoveredDropIndex === index;
              const showingWrong = !solved && wrongGuess !== null && wrongSlotIndex === index;
              const displayValue = solved
                ? (placedValue ?? puzzle.answer)
                : showingWrong
                  ? wrongGuess
                  : placedValue;

              return (
                <motion.button
                  key={`${puzzle.id}-missing-${index}-${showingWrong ? wrongAttemptKey : 0}`}
                  type="button"
                  data-drop-quadrant={index}
                  onClick={() => {
                    if (!solved) onSelectSlot(index);
                  }}
                  role="gridcell"
                  aria-label={
                    solved
                      ? `Quadrant ${index + 1}: solved with ${displayValue}`
                      : placedValue !== undefined
                        ? `Quadrant ${index + 1}: placed ${placedValue} (tap to change)`
                        : `Quadrant ${index + 1}: missing number`
                  }
                  initial={showingWrong ? { x: 0 } : { opacity: 0, scale: 0.86, y: 8 }}
                  animate={
                    solved
                      ? { opacity: 1, scale: [0.85, 1.08, 1], y: 0 }
                      : showingWrong
                        ? { x: [0, -9, 9, -6, 6, -2, 0] }
                        : isDropHover
                          ? { opacity: 1, scale: 1.05, y: 0 }
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
                            delay: isDropHover ? 0 : index * 0.045,
                          }
                  }
                  className={`relative rounded-[20px] flex flex-col items-center justify-center gap-1 select-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
                    solved ? "cursor-default" : "cursor-pointer"
                  } ${
                    solved
                      ? "tile-solved border-2 border-sage"
                      : showingWrong
                        ? "tile-wrong border-2 border-coral"
                        : isDropHover
                          ? "tile-missing border-2 border-amber-warm ring-4 ring-amber-warm/30"
                          : isActive
                            ? "tile-missing border-2 border-dashed border-amber-warm ring-3 ring-amber-warm/20"
                            : "tile-missing border-2 border-dashed border-amber-warm/55"
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
                        className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sage text-white flex items-center justify-center shadow-xs"
                      >
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
                      </motion.span>
                      <span className="font-display text-5xl sm:text-[54px] font-bold text-sage-deep leading-none">
                        {displayValue}
                      </span>
                    </>
                  ) : showingWrong ? (
                    <span className="font-display text-5xl sm:text-[54px] font-bold text-coral-deep leading-none">
                      {wrongGuess}
                    </span>
                  ) : placedValue !== undefined ? (
                    <>
                      <span className="font-display text-4xl sm:text-[50px] font-bold text-amber-deep leading-none">
                        {placedValue}
                      </span>
                      <span className="text-[10px] font-bold text-amber-deep/75">tap to clear</span>
                    </>
                  ) : isActive && pendingTypedPrefix ? (
                    <span className="font-display text-4xl sm:text-5xl font-bold text-amber-deep leading-none">
                      {pendingTypedPrefix}
                      <span className="animate-pulse opacity-60">_</span>
                    </span>
                  ) : (
                    <motion.span
                      animate={isActive ? { y: [0, -3, 0] } : { y: 0 }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className={`font-display text-5xl sm:text-[54px] font-bold leading-none ${
                        isActive ? "text-amber-warm" : "text-amber-warm/65"
                      }`}
                    >
                      ?
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
