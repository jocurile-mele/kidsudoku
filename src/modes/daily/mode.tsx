import { CalendarCheck, CalendarDays } from "lucide-react";
import type { GameModeDefinition } from "../contract";
import { DailyView } from "./DailyView";

export const mode: GameModeDefinition = {
  id: "daily",
  label: "Daily",
  shortLabel: "Daily",
  order: 4,
  supportsTargetSum: false,
  renderIcon: ({ dailyCompletedToday }) =>
    dailyCompletedToday ? (
      <CalendarCheck className="w-3.5 h-3.5 text-sage" />
    ) : (
      <CalendarDays className="w-3.5 h-3.5" />
    ),
  Component: DailyView,
};
