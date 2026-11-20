export type StampId =
  | "acorn"
  | "fox"
  | "crane"
  | "moon"
  | "boat"
  | "pine"
  | "sun"
  | "ladybug"
  | "teacup"
  | "mushroom"
  | "kite"
  | "starlight";

export interface StampDefinition {
  id: StampId;
  name: string;
  requiredRewards: number;
  accent: string;
  wash: string;
}

export const STAMPS: readonly StampDefinition[] = [
  { id: "acorn", name: "Oak Acorn", requiredRewards: 1, accent: "#A66A38", wash: "#F8EFE6" },
  { id: "fox", name: "Little Fox", requiredRewards: 2, accent: "#D86A38", wash: "#FCEEE6" },
  { id: "crane", name: "Paper Crane", requiredRewards: 3, accent: "#3B7DD8", wash: "#EBF3FC" },
  { id: "moon", name: "Crescent Moon", requiredRewards: 4, accent: "#C68A1E", wash: "#FDF6E2" },
  { id: "boat", name: "Paper Boat", requiredRewards: 5, accent: "#48829E", wash: "#EBF4F8" },
  { id: "pine", name: "Cedar Pine", requiredRewards: 6, accent: "#3F8A68", wash: "#E9F5EF" },
  { id: "sun", name: "Morning Sun", requiredRewards: 7, accent: "#DC8624", wash: "#FEF3E2" },
  { id: "ladybug", name: "Garden Beetle", requiredRewards: 8, accent: "#C84E4E", wash: "#FBEBEB" },
  { id: "teacup", name: "Warm Teacup", requiredRewards: 9, accent: "#7D6A9E", wash: "#F2EEF8" },
  { id: "mushroom", name: "Forest Cap", requiredRewards: 10, accent: "#C85E45", wash: "#FCEEE9" },
  { id: "kite", name: "Wind Kite", requiredRewards: 11, accent: "#9B51B6", wash: "#F6ECF9" },
  { id: "starlight", name: "North Star", requiredRewards: 12, accent: "#B87914", wash: "#FEF5DE" },
];

export type ThemeId = "warm-paper" | "matcha-garden" | "cozy-dusk";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  requiredSolved: number;
  swatches: [string, string, string];
}

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: "warm-paper",
    name: "Warm Paper",
    description: "Cream paper & natural birch wood",
    requiredSolved: 0,
    swatches: ["#FBF7EF", "#EFE7D7", "#E6A235"],
  },
  {
    id: "matcha-garden",
    name: "Matcha Garden",
    description: "Soft botanical sage & sunlit stone",
    requiredSolved: 5,
    swatches: ["#F2F7F1", "#DFEBDC", "#4A9D7C"],
  },
  {
    id: "cozy-dusk",
    name: "Cozy Dusk",
    description: "Quiet twilight slate & warm lantern gold",
    requiredSolved: 10,
    swatches: ["#1F2430", "#2B3242", "#EBB04B"],
  },
];

export function getUnlockedStamps(rewardCount: number): StampDefinition[] {
  return STAMPS.filter((s) => rewardCount >= s.requiredRewards);
}

export function isThemeUnlocked(theme: ThemeDefinition, totalSolved: number): boolean {
  return totalSolved >= theme.requiredSolved;
}
