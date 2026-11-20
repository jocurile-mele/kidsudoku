import { motion } from 'motion/react';
import { Flame, HelpCircle, Star, Volume2, VolumeX } from 'lucide-react';

interface HeaderProps {
  totalSolved: number;
  streak: number;
  bestStreak: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenHelp: () => void;
}

export function Header({
  totalSolved,
  streak,
  bestStreak,
  soundEnabled,
  onToggleSound,
  onOpenHelp,
}: HeaderProps) {
  return (
    <header className="w-full max-w-xl mx-auto flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:pt-6">
      {/* Brand mark */}
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-xl bg-[#efe7d7] p-1.5 grid grid-cols-2 gap-1 shadow-[inset_0_1px_3px_rgba(92,76,48,0.14),0_2px_6px_rgba(92,76,48,0.08)]"
        >
          <span className="rounded-[4px] bg-[#fffdf9] shadow-[0_1px_0_#d8ccb6]" />
          <span className="rounded-[4px] bg-[#fffdf9] shadow-[0_1px_0_#d8ccb6]" />
          <span className="rounded-[4px] bg-[#fffdf9] shadow-[0_1px_0_#d8ccb6]" />
          <span className="rounded-[4px] bg-[#fdecc8] border border-dashed border-[#e5a63a]" />
        </div>
        <div className="leading-tight">
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Make 10
          </h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            KidSudoku
          </p>
        </div>
      </div>

      {/* Stats & utility buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Total Stars */}
        <motion.div
          key={`stars-${totalSolved}`}
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 460, damping: 20 }}
          className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-cream border border-[#e6dcc9] shadow-[0_2px_0_#e3d9c5]"
          title={`${totalSolved} puzzles solved`}
        >
          <Star className="w-4 h-4 text-amber-warm fill-amber-warm" />
          <span className="font-display text-sm sm:text-base font-semibold text-ink">
            {totalSolved}
          </span>
        </motion.div>

        {/* Streak */}
        <motion.div
          key={`streak-${streak}`}
          initial={streak > 0 ? { scale: 0.88 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 460, damping: 18 }}
          className={`flex items-center gap-1 h-9 px-3 rounded-full border transition-colors ${
            streak >= 3
              ? 'bg-amber-wash border-[#ecc270] shadow-[0_2px_0_#e4be73] text-amber-deep'
              : 'bg-cream border-[#e6dcc9] shadow-[0_2px_0_#e3d9c5] text-ink'
          }`}
          title={`Current streak: ${streak} (Best: ${bestStreak})`}
        >
          <Flame
            className={`w-4 h-4 transition-colors ${
              streak > 0
                ? 'text-coral fill-amber-warm'
                : 'text-[#bfb5a4]'
            }`}
          />
          <span className="font-display text-sm sm:text-base font-semibold">
            {streak}
          </span>
        </motion.div>

        {/* Sound toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          title={soundEnabled ? 'Sound on (M)' : 'Sound muted (M)'}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-cream border border-[#e6dcc9] shadow-[0_2px_0_#e3d9c5] text-ink-soft hover:text-ink hover:bg-[#fffaf0] active:translate-y-[1px] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4 text-[#aba08e]" />
          )}
        </button>

        {/* Help button */}
        <button
          type="button"
          onClick={onOpenHelp}
          aria-label="How to play"
          title="How to play"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-cream border border-[#e6dcc9] shadow-[0_2px_0_#e3d9c5] text-ink-soft hover:text-ink hover:bg-[#fffaf0] active:translate-y-[1px] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
