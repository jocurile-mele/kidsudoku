import { LayoutGrid } from "lucide-react";
import type { GameModeDefinition } from "../contract";
import { Sudoku4x4View } from "./Sudoku4x4View";

export const mode: GameModeDefinition = {
  id: "sudoku-4x4",
  label: "4×4",
  shortLabel: "4×4",
  order: 3,
  supportsTargetSum: false,
  renderIcon: () => <LayoutGrid className="w-3.5 h-3.5" />,
  Component: Sudoku4x4View,
};
