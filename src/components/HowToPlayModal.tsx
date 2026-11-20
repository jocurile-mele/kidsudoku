import { AnimatePresence, motion } from 'motion/react';
import { Lightbulb, Sparkles, X } from 'lucide-react';

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b2926]/35 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-to-play-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-cream border border-[#e4dac6] p-6 shadow-[0_24px_54px_-16px_rgba(43,41,38,0.28)]"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="how-to-play-title"
                className="font-display text-2xl font-bold text-ink"
              >
                How to Play
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close instructions"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f3ecde] text-ink-soft hover:text-ink transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mini visual example */}
            <div className="flex items-center justify-center gap-4 py-4 px-3 mb-4 rounded-2xl bg-[#f7f2e7] border border-[#e8decb]">
              <div className="shrink-0 grid grid-cols-2 grid-rows-2 gap-1.5 w-24 h-24 p-2 rounded-xl bg-[#ebe2cf]">
                <div className="rounded-lg bg-cream flex items-center justify-center font-display text-xl font-bold text-ink shadow-[0_2px_0_#d7cbb4]">
                  3
                </div>
                <div className="rounded-lg bg-cream flex items-center justify-center font-display text-xl font-bold text-ink shadow-[0_2px_0_#d7cbb4]">
                  2
                </div>
                <div className="rounded-lg bg-cream flex items-center justify-center font-display text-xl font-bold text-ink shadow-[0_2px_0_#d7cbb4]">
                  1
                </div>
                <div className="rounded-lg bg-sage-wash border border-sage flex items-center justify-center font-display text-xl font-bold text-sage-deep">
                  4
                </div>
              </div>
              <div className="text-left">
                <p className="font-display text-lg font-bold text-ink">
                  3 + 2 + 1 + <span className="text-sage-deep">4</span> = 10
                </p>
                <p className="text-xs font-semibold text-ink-soft mt-1">
                  Find the missing number so all 4 squares add up to 10.
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-sm text-ink-soft font-semibold mb-5">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-amber-wash text-amber-deep flex items-center justify-center font-display text-xs font-bold">
                  1
                </span>
                <span>
                  Numbers <strong className="text-ink">can repeat</strong>, and{' '}
                  <strong className="text-ink">0 is allowed</strong>!
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-slate-wash text-slate-sky flex items-center justify-center">
                  <Lightbulb className="w-3 h-3" />
                </span>
                <span>
                  Tap <strong className="text-ink">Hint</strong> to see a 10-bead
                  counting frame, or tap again to narrow the choices.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-sage-wash text-sage-deep flex items-center justify-center">
                  <Sparkles className="w-3 h-3" />
                </span>
                <span>
                  Solve 5 puzzles to complete a star set. Keyboard keys{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-[#f1eadc] text-ink text-xs font-bold">
                    0–9
                  </kbd>{' '}
                  work too!
                </span>
              </li>
            </ul>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-sage text-white font-display text-lg font-semibold shadow-[0_4px_0_#317559] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_2px_0_#317559] transition cursor-pointer"
            >
              Let&apos;s Play!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
