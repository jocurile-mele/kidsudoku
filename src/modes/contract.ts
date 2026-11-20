import type { ComponentType, ReactNode } from "react";
import type { ProgressStore } from "../state/useProgress";

export interface ModeProgressSnapshot {
  starsInSet: number;
  setSize: number;
  dailyLabel: string | null;
}

export interface GameModeProps {
  todayKey: string;
  streak: number;
  onStreakChange: (next: number) => void;
  progressStore: ProgressStore;
  modalsOpen: boolean;
  onChangeMode: (modeId: string) => void;
  onOpenShelf: () => void;
  onProgressSnapshot: (snapshot: ModeProgressSnapshot) => void;
}

export interface ModeIconContext {
  dailyCompletedToday: boolean;
}

/**
 * Contract every owned mode folder under `src/modes/<slug>/mode.tsx` exports.
 * `src/modes/index.ts` auto-discovers all modes by convention — no central registry edits.
 */
export interface GameModeDefinition {
  id: string;
  label: string;
  shortLabel: string;
  order: number;
  supportsTargetSum: boolean;
  renderIcon: (ctx: ModeIconContext) => ReactNode;
  Component: ComponentType<GameModeProps>;
}
