import { motion } from 'motion/react';
import { CalendarCheck, CalendarDays, Grid2X2, LayoutGrid, Sparkles } from 'lucide-react';

export type GameMode = 'classic' | 'two-blank' | 'sudoku-4x4' | 'daily';

interface ModeBarProps {
  mode: GameMode;
  onChangeMode: (mode: GameMode) => void;
  dailyCompletedToday: boolean;
}

const MODES: Array<{
  id: GameMode;
  label: string;
  shortLabel: string;
}> = [
  { id: 'classic', label: '2×2', shortLabel: '2×2' },
  { id: 'two-blank', label: '2 Blank', shortLabel: '2 Blank' },
  { id: 'sudoku-4x4', label: '4×4', shortLabel: '4×4' },
  { id: 'daily', label: 'Daily', shortLabel: 'Daily' },
];

export function ModeBar({
  mode,
  onChangeMode,
  dailyCompletedToday,
}: ModeBarProps) {
  return (
    <nav
      aria-label="Game modes"
      className="inline-flex items-center p-1 rounded-full cs-muted-pill border shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
    >
      {MODES.map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChangeMode(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
              active ? 'text-ink' : 'text-ink-soft [@media(hover:hover)]:hover:text-ink'
            }`}
          >
            {active && (
              <motion.span
                layoutId="active-mode-pill"
                transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                className="absolute inset-0 rounded-full cs-surface border shadow-[0_2px_6px_-2px_rgba(0,0,0,0.14)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              {item.id === 'classic' && <Grid2X2 className="w-3.5 h-3.5" />}
              {item.id === 'two-blank' && <Sparkles className="w-3.5 h-3.5" />}
              {item.id === 'sudoku-4x4' && <LayoutGrid className="w-3.5 h-3.5" />}
              {item.id === 'daily' &&
                (dailyCompletedToday ? (
                  <CalendarCheck className="w-3.5 h-3.5 text-sage" />
                ) : (
                  <CalendarDays className="w-3.5 h-3.5" />
                ))}
              <span>{item.shortLabel}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
