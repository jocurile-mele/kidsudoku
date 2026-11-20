import { AnimatePresence, motion } from "motion/react";
import { SlidersHorizontal, Star, X } from "lucide-react";
import type { TargetSum } from "../engine/make-sum/puzzle";
import type { StampId } from "../rewards/stamps";
import { StarTrack } from "../rewards/StarTrack";

const TARGET_OPTIONS: ReadonlyArray<{ value: TargetSum; label: string }> = [
  { value: 5, label: "Warm-up" },
  { value: 10, label: "Classic" },
  { value: 20, label: "Challenge" },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  supportsTargetSum: boolean;
  targetSum: TargetSum;
  onChangeTargetSum: (target: TargetSum) => void;
  starsInSet: number;
  setSize: number;
  setsCompleted: number;
  pinnedStampId: StampId | null;
  dailyLabel: string | null;
  onOpenShelf: () => void;
}

export function SettingsModal({
  open,
  onClose,
  supportsTargetSum,
  targetSum,
  onChangeTargetSum,
  starsInSet,
  setSize,
  setsCompleted,
  pinnedStampId,
  dailyLabel,
  onOpenShelf,
}: SettingsModalProps) {
  const isDaily = dailyLabel !== null;
  const remaining = Math.max(0, setSize - starsInSet);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl cs-surface border p-5 sm:p-6 shadow-[0_24px_54px_-16px_rgba(0,0,0,0.34)]"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 id="settings-title" className="font-display text-2xl font-bold text-ink">
                  Settings
                </h2>
                <p className="text-xs font-semibold text-ink-soft">Target sum &amp; set progress</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center cs-muted-pill cs-press-in text-ink-soft [@media(hover:hover)]:hover:text-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Sum (Sum to 5 / 10 / 20) */}
            <section className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-amber-warm" />
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                    Sum To
                  </h3>
                </div>
                <span className="font-display text-xs font-bold text-amber-deep">
                  Makes {targetSum}
                </span>
              </div>

              <div
                role="group"
                aria-label="Target sum"
                className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl cs-muted-pill border"
              >
                {TARGET_OPTIONS.map((option) => {
                  const active = targetSum === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChangeTargetSum(option.value)}
                      aria-pressed={active}
                      className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl cs-press-in cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
                        active
                          ? "bg-amber-warm text-white shadow-[0_2px_8px_-2px_rgba(184,121,20,0.45)]"
                          : "text-ink-soft [@media(hover:hover)]:hover:text-ink [@media(hover:hover)]:hover:bg-[var(--cs-cream)]/60"
                      }`}
                    >
                      <span className="font-display text-xl font-bold leading-none">
                        {option.value}
                      </span>
                      <span
                        className={`text-[10px] font-bold mt-1 leading-none ${
                          active ? "text-white/90" : "text-ink-soft/80"
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] font-semibold text-ink-soft mt-2">
                {supportsTargetSum
                  ? `All 4 squares add up to ${targetSum} in 2×2 & 2 Blank.`
                  : "Applies to 2×2 & 2 Blank modes (Daily & 4×4 always sum to 10)."}
              </p>
            </section>

            {/* 5-Star Set Progress */}
            <section className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <Star className="w-4 h-4 text-amber-warm fill-amber-warm" />
                <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                  {isDaily ? "Daily Progress" : "Set Progress"}
                </h3>
              </div>

              <div className="rounded-2xl bg-[var(--cs-paper)]/70 border border-[var(--cs-border)] p-3.5 flex flex-col items-center gap-2.5">
                <StarTrack
                  starsInSet={starsInSet}
                  setsCompleted={setsCompleted}
                  pinnedStampId={pinnedStampId}
                  onOpenShelf={onOpenShelf}
                  dailyLabel={dailyLabel}
                />
                <p className="text-[11px] font-semibold text-ink-soft text-center">
                  {isDaily
                    ? remaining === 0
                      ? "Today's Daily 5 is complete!"
                      : `${remaining} ${remaining === 1 ? "square" : "squares"} left in today's Daily 5.`
                    : remaining === 0
                      ? "Set complete! Ready for the next 5 stars."
                      : `${remaining} more ${remaining === 1 ? "star" : "stars"} to finish this set & earn a stamp.`}
                </p>
              </div>
            </section>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl next-cta text-white font-display text-base font-semibold [@media(hover:hover)]:hover:brightness-105 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
