import type { ReactNode } from "react";
import { motion } from "motion/react";

export interface ModeBarItem {
  id: string;
  shortLabel: string;
  icon: ReactNode;
}

interface ModeBarProps {
  modes: readonly ModeBarItem[];
  activeModeId: string;
  onChangeMode: (modeId: string) => void;
}

export function ModeBar({ modes, activeModeId, onChangeMode }: ModeBarProps) {
  return (
    <nav
      aria-label="Game modes"
      className="inline-flex items-center p-1 rounded-full cs-muted-pill border shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
    >
      {modes.map((item) => {
        const active = activeModeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChangeMode(item.id)}
            aria-current={active ? "page" : undefined}
            className={`relative px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-bold transition-[color,transform] duration-100 active:scale-[0.96] cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-warm ${
              active ? "text-ink" : "text-ink-soft [@media(hover:hover)]:hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="active-mode-pill"
                transition={{ type: "spring", stiffness: 460, damping: 30 }}
                className="absolute inset-0 rounded-full cs-surface border shadow-[0_2px_6px_-2px_rgba(0,0,0,0.14)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              {item.icon}
              <span>{item.shortLabel}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
