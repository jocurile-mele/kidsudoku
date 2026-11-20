import { Grid2X2 } from "lucide-react";
import { MakeSumSession } from "../../ui/MakeSumSession";
import type { GameModeDefinition, GameModeProps } from "../contract";

function ClassicModeView({
  streak,
  onStreakChange,
  progressStore,
  modalsOpen,
  onProgressSnapshot,
}: GameModeProps) {
  return (
    <MakeSumSession
      missingCount={1}
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
  id: "classic",
  label: "2×2",
  shortLabel: "2×2",
  order: 1,
  supportsTargetSum: true,
  renderIcon: () => <Grid2X2 className="w-3.5 h-3.5" />,
  Component: ClassicModeView,
};
