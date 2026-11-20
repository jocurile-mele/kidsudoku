import { motion } from "motion/react";
import { TARGET_SUM, type Puzzle } from "../game/puzzle";

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
}

export function TenFrameHint({ puzzle, hintLevel, solved }: TenFrameHintProps) {
  // Build flat list of 10 bead slots mapped to their source tile group
  const slots: Array<{ groupIndex: number | null }> = [];

  puzzle.givenEntries.forEach((entry, groupIndex) => {
    for (let i = 0; i < entry.value; i++) {
      slots.push({ groupIndex });
    }
  });

  while (slots.length < TARGET_SUM) {
    slots.push({ groupIndex: null });
  }

  const remaining = puzzle.answer;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -6 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden w-full max-w-[300px] mx-auto"
    >
      <div className="px-3.5 py-2.5 rounded-2xl bg-cream/95 border border-[#e5dac6] shadow-[0_4px_14px_-6px_rgba(84,68,42,0.12)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-ink-soft">
            Ten-Frame Helper
          </span>
          <span className="font-display text-xs font-semibold text-ink-soft">
            {hintLevel >= 2 ? (
              <span>
                {puzzle.givenEntries.map((e) => e.value).join(" + ")} ={" "}
                <strong className="text-ink">{puzzle.givenSum}</strong>
              </span>
            ) : solved ? (
              <span className="text-sage-deep">10 of 10 filled!</span>
            ) : remaining === 0 ? (
              <span className="text-amber-deep">All 10 spots are full!</span>
            ) : (
              <span>Count the open spots</span>
            )}
          </span>
        </div>

        {/* Classic 2x5 Ten-Frame */}
        <div
          className="grid grid-cols-5 gap-1.5 p-1.5 rounded-xl bg-[#f3ecde] shadow-[inset_0_2px_4px_rgba(92,76,48,0.1)]"
          role="img"
          aria-label={`Ten-frame showing ${puzzle.givenSum} filled beads and ${remaining} open spots out of 10`}
        >
          {slots.map((slot, i) => {
            const isGivenBead = slot.groupIndex !== null;
            const style =
              slot.groupIndex !== null
                ? HINT_GROUP_STYLES[slot.groupIndex % HINT_GROUP_STYLES.length]
                : null;

            return (
              <div
                key={i}
                className="h-8 sm:h-9 rounded-lg bg-[#fbf7ef] border border-[#e3d9c5] flex items-center justify-center p-1"
              >
                {isGivenBead && style ? (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 20,
                      delay: i * 0.03,
                    }}
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${style.bead}`}
                  />
                ) : solved ? (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 18,
                      delay: (i - puzzle.givenSum) * 0.05,
                    }}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-b from-[#69ba98] to-[#4a9d7c] shadow-[0_2px_0_#317559]"
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.18 + (i - puzzle.givenSum) * 0.04 }}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-dashed border-amber-warm/80 bg-amber-wash/75 animate-pulse-soft"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
