import { motion } from "motion/react";
import type { Puzzle, QuadrantIndex } from "../game/puzzle";

export const HINT_GROUP_STYLES = [
  {
    name: "cobalt",
    dot: "bg-[#3B7DD8]",
    ring: "ring-[#3B7DD8]/35",
    badge: "bg-[#eaf2fc] text-[#285da8] border-[#c2d8f5]",
    bead: "bg-gradient-to-b from-[#5694E8] to-[#3271C8] shadow-[0_2px_0_#235296]",
  },
  {
    name: "orange",
    dot: "bg-[#EC7B29]",
    ring: "ring-[#EC7B29]/35",
    badge: "bg-[#fef1e6] text-[#b5500d] border-[#f6cfa9]",
    bead: "bg-gradient-to-b from-[#F69346] to-[#E16B1C] shadow-[0_2px_0_#B44F0E]",
  },
  {
    name: "plum",
    dot: "bg-[#9B51B6]",
    ring: "ring-[#9B51B6]/35",
    badge: "bg-[#f6ecf9] text-[#6d3185] border-[#dec1ea]",
    bead: "bg-gradient-to-b from-[#B06BCA] to-[#8A42A6] shadow-[0_2px_0_#662B7E]",
  },
] as const;

interface TenFrameHintProps {
  puzzle: Puzzle;
  hintLevel: number;
  solved: boolean;
  filledSlots?: Partial<Record<QuadrantIndex, number>>;
}

type SlotKind = { type: "given"; groupIndex: number } | { type: "placed" } | { type: "empty" };

export function TenFrameHint({ puzzle, hintLevel, solved, filledSlots = {} }: TenFrameHintProps) {
  const slots: SlotKind[] = [];

  puzzle.givenEntries.forEach((entry, groupIndex) => {
    for (let i = 0; i < entry.value; i++) {
      if (slots.length < puzzle.targetSum) {
        slots.push({ type: "given", groupIndex });
      }
    }
  });

  let placedSum = 0;
  for (const idx of puzzle.missingIndices) {
    const val = filledSlots[idx];
    if (val !== undefined) {
      placedSum += val;
      for (let i = 0; i < val; i++) {
        if (slots.length < puzzle.targetSum) {
          slots.push({ type: "placed" });
        }
      }
    }
  }

  while (slots.length < puzzle.targetSum) {
    slots.push({ type: "empty" });
  }

  const totalFilled = puzzle.givenSum + placedSum;
  const remaining = Math.max(0, puzzle.targetSum - totalFilled);
  const frameTitle =
    puzzle.targetSum === 5
      ? "Five-Frame Helper"
      : puzzle.targetSum === 20
        ? "Double Ten-Frame"
        : "Ten-Frame Helper";

  const isDouble = puzzle.targetSum === 20;
  const frames = isDouble ? [slots.slice(0, 10), slots.slice(10, 20)] : [slots];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -6 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -6 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`overflow-hidden w-full mx-auto ${isDouble ? "max-w-[440px]" : "max-w-[300px]"}`}
    >
      <div className="px-3.5 py-2.5 rounded-2xl cs-surface border shadow-[0_4px_14px_-6px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            {frameTitle}
          </span>
          <span className="font-display text-xs font-semibold text-ink-soft">
            {hintLevel >= 2 ? (
              <span>
                {puzzle.givenEntries.map((e) => e.value).join(" + ")} ={" "}
                <strong className="text-ink">{puzzle.givenSum}</strong>
              </span>
            ) : solved ? (
              <span className="text-sage-deep">
                {puzzle.targetSum} of {puzzle.targetSum} filled!
              </span>
            ) : remaining === 0 ? (
              <span className="text-amber-deep">All {puzzle.targetSum} spots are full!</span>
            ) : (
              <span>
                {puzzle.missingCount === 2
                  ? `${remaining} open spots left`
                  : "Count the open spots"}
              </span>
            )}
          </span>
        </div>

        <div
          className={isDouble ? "grid grid-cols-2 gap-2" : "block"}
          role="img"
          aria-label={`${frameTitle} showing ${totalFilled} filled beads and ${remaining} open spots out of ${puzzle.targetSum}`}
        >
          {frames.map((frameSlots, fIdx) => (
            <div
              key={fIdx}
              className="grid grid-cols-5 gap-1 p-1.5 rounded-xl cs-muted-pill shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]"
            >
              {frameSlots.map((slot, i) => {
                const globalIdx = fIdx * 10 + i;
                const style =
                  slot.type === "given"
                    ? HINT_GROUP_STYLES[slot.groupIndex % HINT_GROUP_STYLES.length]
                    : null;

                return (
                  <div
                    key={globalIdx}
                    className={`${
                      isDouble ? "h-7 sm:h-8" : "h-8 sm:h-9"
                    } rounded-lg cs-surface border flex items-center justify-center p-1`}
                  >
                    {slot.type === "given" && style ? (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 20,
                          delay: Math.min(globalIdx * 0.02, 0.28),
                        }}
                        className={`${
                          isDouble ? "w-4 h-4 sm:w-5 sm:h-5" : "w-5 h-5 sm:w-6 sm:h-6"
                        } rounded-full ${style.bead}`}
                      />
                    ) : slot.type === "placed" || solved ? (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 18,
                        }}
                        className={`${
                          isDouble ? "w-4 h-4 sm:w-5 sm:h-5" : "w-5 h-5 sm:w-6 sm:h-6"
                        } rounded-full ${
                          solved
                            ? "bg-gradient-to-b from-[#69ba98] to-[#4a9d7c] shadow-[0_2px_0_#317559]"
                            : "bg-gradient-to-b from-[#f3bc56] to-[#e09d2c] shadow-[0_2px_0_#b37614]"
                        }`}
                      />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.14 }}
                        className={`${
                          isDouble ? "w-4 h-4 sm:w-5 sm:h-5" : "w-5 h-5 sm:w-6 sm:h-6"
                        } rounded-full border-2 border-dashed border-amber-warm/80 bg-amber-wash/75 animate-pulse-soft`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
