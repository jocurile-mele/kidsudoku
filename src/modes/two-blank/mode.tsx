import { Sparkles } from "lucide-react";
import { MakeSumSession } from "../../ui/MakeSumSession";
import type { GameModeDefinition, GameModeProps } from "../contract";

function TwoBlankModeView({
  streak,
  onStreakChange,
  progressStore,
  modalsOpen,
  onProgressSnapshot,
}: GameModeProps) {
  return (
    <MakeSumSession
      missingCount={2}
      targetSum={progressStore.progress.targetSum}
      streak={streak}
      onStreakChange={onStreakChange}
      progressStore={progressStore}
      modalsOpen={modalsOpen}
      onProgressSnapshot={onProgressSnapshot}
    />
  );
}

export const mode: GameModeDefinition = {
  id: "two-blank",
  label: "2 Blank",
  shortLabel: "2 Blank",
  order: 2,
  supportsTargetSum: true,
  renderIcon: () => <Sparkles className="w-3.5 h-3.5" />,
  Component: TwoBlankModeView,
};
