import { motion } from 'motion/react';
import { Flame, HelpCircle, Star, Volume2, VolumeX } from 'lucide-react';

interface HeaderProps {
  totalSolved: number;
  streak: number;
  bestStreak: number;
  soundEnabled: boolean;
  logoPlaying: boolean;
  logoPressCount: number;
  onLogoClick: () => void;
  onToggleSound: () => void;
  onOpenHelp: () => void;
}

export function Header({
  totalSolved,
  streak,
  bestStreak,
  soundEnabled,
  logoPlaying,
  logoPressCount,
  onLogoClick,
  onToggleSound,
  onOpenHelp,
}: HeaderProps) {
  return (
    <header className="w-full max-w-xl mx-auto flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-1.5 sm:pt-5 sm:pb-2 [@media(orientation:landscape)_and_(max-height:520px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:520px)]:pt-2 [@media(orientation:landscape)_and_(max-height:520px)]:pb-1">
      {/* Interactive brand logo */}
      <motion.button
        type="button"
        onClick={onLogoClick}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
        aria-label="Play KidSudoku voice clip"
        title={soundEnabled ? 'Tap to play KidSudoku sound' : 'Unmute sound to play'}
        className="group flex items-center gap-2 sm:gap-2.5 text-left rounded-2xl pr-1.5 sm:pr-2 -ml-1 p-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm shrink-0"
      >
        <motion.div
          key={`logo-mark-${logoPressCount}`}
          aria-hidden="true"
          initial={false}
          animate={
            logoPressCount > 0
              ? {
                  rotate: [0, -8, 8, -4, 0],
                  scale: [1, 1.12, 1.04, 1],
                }
              : { rotate: 0, scale: 1 }
          }
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#efe7d7] p-1.5 grid grid-cols-2 gap-1 shadow-[inset_0_1px_3px_rgba(92,76,48,0.14),0_2px_6px_rgba(92,76,48,0.08)] transition-all duration-200 ${
            logoPlaying
              ? 'ring-3 ring-amber-warm/50 bg-[#f6ecd7]'
              : '[@media(hover:hover)]:group-hover:ring-2 [@media(hover:hover)]:group-hover:ring-amber-warm/30'
          }`}
        >
          <span className="rounded-[4px] bg-[#fffdf9] shadow-[0_1px_0_#d8ccb6]" />
          <span className="rounded-[4px] bg-[#fffdf9] shadow-[0_1px_0_#d8ccb6]" />
          <span className="rounded-[4px] bg-[#fffdf9] shadow-[0_1px_0_#d8ccb6]" />
          <span
            className={`rounded-[4px] border border-dashed transition-colors ${
              logoPlaying
                ? 'bg-sage-wash border-sage'
                : 'bg-[#fdecc8] border-[#e5a63a]'
            }`}
          />
        </motion.div>
        <div className="leading-tight">
          <h1 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-ink">
            KidSudoku
          </h1>
          <p className="text-[11px] font-bold tracking-[0.12em] text-ink-soft">
            calmstead
          </p>
        </div>
      </motion.button>

      {/* Stats & utility buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Total Stars */}
        <motion.div
          key={`stars-${totalSolved}`}
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 460, damping: 20 }}
          className="flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full bg-cream border border-[#e6dcc9] shadow-[0_2px_0_#e3d9c5]"
          title={`${totalSolved} puzzles solved`}
        >
          <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-warm fill-amber-warm" />
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
          className={`flex items-center gap-1 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border transition-colors ${
            streak >= 3
              ? 'bg-amber-wash border-[#ecc270] shadow-[0_2px_0_#e4be73] text-amber-deep'
              : 'bg-cream border-[#e6dcc9] shadow-[0_2px_0_#e3d9c5] text-ink'
          }`}
          title={`Current streak: ${streak} (Best: ${bestStreak})`}
        >
          <Flame
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
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
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-cream border border-[#e6dcc9] shadow-[0_2px_0_#e3d9c5] text-ink-soft [@media(hover:hover)]:hover:text-ink [@media(hover:hover)]:hover:bg-[#fffaf0] active:translate-y-[1px] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm"
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
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-cream border border-[#e6dcc9] shadow-[0_2px_0_#e3d9c5] text-ink-soft [@media(hover:hover)]:hover:text-ink [@media(hover:hover)]:hover:bg-[#fffaf0] active:translate-y-[1px] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
