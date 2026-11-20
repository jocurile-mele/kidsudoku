import { AnimatePresence, motion } from 'motion/react';
import { Check, Lock, Palette, Pin, Sparkles, X } from 'lucide-react';
import {
  STAMPS,
  THEMES,
  isThemeUnlocked,
  type StampId,
  type ThemeId,
} from '../game/stamps';
import { StampIcon } from './StampIcon';

interface StampShelfModalProps {
  open: boolean;
  onClose: () => void;
  totalSolved: number;
  rewardCount: number;
  activeTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  pinnedStampId: StampId | null;
  onPinStamp: (id: StampId | null) => void;
}

export function StampShelfModal({
  open,
  onClose,
  totalSolved,
  rewardCount,
  activeTheme,
  onSelectTheme,
  pinnedStampId,
  onPinStamp,
}: StampShelfModalProps) {
  const unlockedCount = STAMPS.filter((s) => rewardCount >= s.requiredRewards).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/40 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shelf-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[86dvh] overflow-y-auto rounded-3xl cs-surface border p-5 sm:p-6 shadow-[0_24px_54px_-16px_rgba(0,0,0,0.34)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  id="shelf-title"
                  className="font-display text-2xl font-bold text-ink"
                >
                  Stamp Shelf &amp; Themes
                </h2>
                <p className="text-xs font-semibold text-ink-soft">
                  Finish 5-star sets, Daily challenges, or 4×4 boards to collect stamps
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close stamp shelf"
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center cs-muted-pill cs-press-in text-ink-soft hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Paper Themes */}
            <section className="mb-5">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Palette className="w-4 h-4 text-amber-warm" />
                <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                  Paper Themes
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((theme) => {
                  const unlocked = isThemeUnlocked(theme, totalSolved);
                  const selected = activeTheme === theme.id;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onSelectTheme(theme.id)}
                      className={`relative flex flex-col items-start gap-2 p-2.5 rounded-2xl border text-left cs-press-in ${
                        selected
                          ? 'border-sage ring-2 ring-sage/25 bg-sage-wash/60 cursor-pointer'
                          : unlocked
                            ? 'cs-surface hover:border-amber-warm/60 cursor-pointer'
                            : 'cs-muted-pill opacity-65 cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {theme.swatches.map((hex, i) => (
                          <span
                            key={i}
                            className="w-4 h-4 rounded-full border border-black/15"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      <div className="leading-tight">
                        <div className="font-display text-xs sm:text-sm font-bold text-ink">
                          {theme.name}
                        </div>
                        <div className="text-[10px] font-bold text-ink-soft mt-0.5">
                          {selected ? (
                            <span className="inline-flex items-center gap-0.5 text-sage-deep">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : unlocked ? (
                            'Tap to use'
                          ) : (
                            <span className="inline-flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> {theme.requiredSolved} ★
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Woodblock Stamps */}
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-warm" />
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                    Woodblock Stamps
                  </h3>
                </div>
                <span className="font-display text-xs font-bold text-ink-soft">
                  {unlockedCount} / {STAMPS.length}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {STAMPS.map((stamp) => {
                  const unlocked = rewardCount >= stamp.requiredRewards;
                  const pinned = pinnedStampId === stamp.id;

                  return (
                    <button
                      key={stamp.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onPinStamp(pinned ? null : stamp.id)}
                      title={
                        unlocked
                          ? pinned
                            ? `${stamp.name} (Pinned — tap to unpin)`
                            : `Tap to pin ${stamp.name}`
                          : `Unlocks after ${stamp.requiredRewards} completed ${
                              stamp.requiredRewards === 1 ? 'set' : 'sets'
                            }`
                      }
                      className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-1.5 rounded-2xl border cs-press-in ${
                        pinned
                          ? 'border-amber-warm ring-2 ring-amber-warm/30 bg-amber-wash/75 cursor-pointer'
                          : unlocked
                            ? 'cs-surface hover:border-amber-warm/60 cursor-pointer'
                            : 'cs-muted-pill opacity-55 cursor-default'
                      }`}
                    >
                      {pinned && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-warm text-white flex items-center justify-center">
                          <Pin className="w-2.5 h-2.5" />
                        </span>
                      )}

                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border"
                        style={
                          unlocked
                            ? {
                                backgroundColor: stamp.wash,
                                color: stamp.accent,
                                borderColor: `${stamp.accent}33`,
                              }
                            : {
                                backgroundColor: 'transparent',
                                color: 'var(--cs-ink-muted)',
                                borderColor: 'var(--cs-border)',
                              }
                        }
                      >
                        {unlocked ? (
                          <StampIcon id={stamp.id} className="w-7 h-7" />
                        ) : (
                          <Lock className="w-4 h-4 opacity-60" />
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-ink leading-tight text-center truncate w-full">
                        {unlocked ? stamp.name : `Set ${stamp.requiredRewards}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {unlockedCount > 0 && (
                <p className="text-[11px] font-semibold text-ink-soft text-center mt-3">
                  Tap any unlocked stamp to pin it beside your stars!
                </p>
              )}
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
