export type TargetSum = 5 | 10 | 20;
export type MissingCount = 1 | 2;
export type QuadrantIndex = 0 | 1 | 2 | 3;

export const TARGET_SUM = 10;
export const SET_SIZE = 5;
export const DAILY_SIZE = 5;

export interface Puzzle {
  id: string;
  targetSum: TargetSum;
  missingCount: MissingCount;
  cells: [number | null, number | null, number | null, number | null];
  missingIndices: QuadrantIndex[];
  /** Primary missing index (convenience for 1-missing puzzles) */
  missingIndex: QuadrantIndex;
  /** Canonical answer for 1-missing puzzles; remainder sum for 2-missing puzzles */
  answer: number;
  /** Sum needed across all missing cells (equals targetSum - givenSum) */
  neededSum: number;
  givenSum: number;
  givenEntries: Array<{ index: QuadrantIndex; value: number }>;
}

export type GuessStatus = "correct" | "too-high" | "too-low";

export interface GuessEvaluation {
  status: GuessStatus;
  guess: number;
  total: number;
  diff: number;
}

type QuadTuple = readonly [number, number, number, number];

const compositionCache = new Map<number, readonly QuadTuple[]>();

/**
 * Enumerates all weak compositions of `targetSum` into 4 non-negative integers.
 * Guarantees exact uniform random sampling with repeats and 0 allowed.
 */
export function getCompositions(targetSum: number): readonly QuadTuple[] {
  const cached = compositionCache.get(targetSum);
  if (cached) return cached;

  const result: QuadTuple[] = [];
  for (let a = 0; a <= targetSum; a++) {
    for (let b = 0; b <= targetSum - a; b++) {
      for (let c = 0; c <= targetSum - a - b; c++) {
        const d = targetSum - a - b - c;
        result.push([a, b, c, d] as const);
      }
    }
  }
  compositionCache.set(targetSum, result);
  return result;
}

export const ALL_COMPOSITIONS: readonly QuadTuple[] = getCompositions(TARGET_SUM);

let nextPuzzleCounter = 1;

function randomInt(maxExclusive: number, rng: () => number): number {
  return Math.min(maxExclusive - 1, Math.floor(rng() * maxExclusive));
}

function cellsSignature(cells: Puzzle["cells"]): string {
  return cells.map((c) => (c === null ? "?" : String(c))).join(",");
}

export interface GeneratePuzzleOptions {
  targetSum?: TargetSum;
  missingCount?: MissingCount;
  previous?: Puzzle;
  rng?: () => number;
  idPrefix?: string;
}

export function generatePuzzle(
  previousOrOptions?: Puzzle | GeneratePuzzleOptions,
  legacyRng?: () => number,
): Puzzle {
  let targetSum: TargetSum = 10;
  let missingCount: MissingCount = 1;
  let previous: Puzzle | undefined;
  let rng: () => number = legacyRng ?? Math.random;
  let idPrefix = "puzzle";

  if (previousOrOptions && "cells" in previousOrOptions) {
    previous = previousOrOptions;
  } else if (previousOrOptions) {
    targetSum = previousOrOptions.targetSum ?? 10;
    missingCount = previousOrOptions.missingCount ?? 1;
    previous = previousOrOptions.previous;
    rng = previousOrOptions.rng ?? Math.random;
    idPrefix = previousOrOptions.idPrefix ?? "puzzle";
  }

  const compositions = getCompositions(targetSum);
  let chosenTuple: QuadTuple = compositions[0];
  let missingIndices: QuadrantIndex[] = [0];

  for (let attempt = 0; attempt < 14; attempt++) {
    chosenTuple = compositions[randomInt(compositions.length, rng)];
    const first = randomInt(4, rng) as QuadrantIndex;

    if (missingCount === 1) {
      missingIndices = [first];
    } else {
      const others = ([0, 1, 2, 3] as QuadrantIndex[]).filter((i) => i !== first);
      const second = others[randomInt(others.length, rng)];
      missingIndices = [first, second].sort((a, b) => a - b) as QuadrantIndex[];
    }

    if (!previous) break;

    const missingSet = new Set<number>(missingIndices);
    const candidateCells: Puzzle["cells"] = [
      missingSet.has(0) ? null : chosenTuple[0],
      missingSet.has(1) ? null : chosenTuple[1],
      missingSet.has(2) ? null : chosenTuple[2],
      missingSet.has(3) ? null : chosenTuple[3],
    ];

    const sameBoard = cellsSignature(candidateCells) === cellsSignature(previous.cells);
    const sameSpotAndAnswer =
      missingCount === 1 &&
      previous.missingCount === 1 &&
      missingIndices[0] === previous.missingIndex &&
      chosenTuple[missingIndices[0]] === previous.answer;

    if (!sameBoard && !sameSpotAndAnswer) {
      break;
    }
  }

  const missingSet = new Set<number>(missingIndices);
  const cells: Puzzle["cells"] = [
    missingSet.has(0) ? null : chosenTuple[0],
    missingSet.has(1) ? null : chosenTuple[1],
    missingSet.has(2) ? null : chosenTuple[2],
    missingSet.has(3) ? null : chosenTuple[3],
  ];

  const givenEntries: Array<{ index: QuadrantIndex; value: number }> = [];
  let givenSum = 0;
  for (let i = 0; i < 4; i++) {
    const val = cells[i];
    if (val !== null) {
      givenEntries.push({ index: i as QuadrantIndex, value: val });
      givenSum += val;
    }
  }

  const neededSum = targetSum - givenSum;
  const answer = missingCount === 1 ? chosenTuple[missingIndices[0]] : neededSum;

  return {
    id: `${idPrefix}-${Date.now()}-${nextPuzzleCounter++}`,
    targetSum,
    missingCount,
    cells,
    missingIndices,
    missingIndex: missingIndices[0],
    answer,
    neededSum,
    givenSum,
    givenEntries,
  };
}

export function evaluateGuess(puzzle: Puzzle, guess: number): GuessEvaluation {
  const total = puzzle.givenSum + guess;
  const diff = total - puzzle.targetSum;

  if (diff === 0) {
    return { status: "correct", guess, total, diff };
  }

  return {
    status: diff > 0 ? "too-high" : "too-low",
    guess,
    total,
    diff,
  };
}

export function evaluateMultiGuess(
  puzzle: Puzzle,
  filled: Partial<Record<QuadrantIndex, number>>,
): GuessEvaluation | null {
  let placedSum = 0;
  for (const idx of puzzle.missingIndices) {
    const val = filled[idx];
    if (val === undefined) return null;
    placedSum += val;
  }

  const total = puzzle.givenSum + placedSum;
  const diff = total - puzzle.targetSum;
  if (diff === 0) {
    return { status: "correct", guess: placedSum, total, diff };
  }
  return {
    status: diff > 0 ? "too-high" : "too-low",
    guess: placedSum,
    total,
    diff,
  };
}

/**
 * Returns 3 distinct choices (including a valid answer) for gentle Hint Level 2.
 */
export function getHintChoices(
  puzzle: Puzzle,
  rng: () => number = Math.random,
  alreadyFilledSum = 0,
): number[] {
  const targetForSlot =
    puzzle.missingCount === 1
      ? puzzle.answer
      : Math.max(0, Math.min(puzzle.targetSum, puzzle.neededSum - alreadyFilledSum));

  const candidates: number[] = [];
  for (const delta of [-2, -1, 1, 2, -3, 3]) {
    const val = targetForSlot + delta;
    if (val >= 0 && val <= puzzle.targetSum && !candidates.includes(val)) {
      candidates.push(val);
    }
  }

  const pool = [...candidates];
  const picked = new Set<number>([targetForSlot]);

  while (picked.size < 3 && pool.length > 0) {
    const idx = randomInt(Math.min(pool.length, 4), rng);
    picked.add(pool.splice(idx, 1)[0]);
  }

  return Array.from(picked).sort((a, b) => a - b);
}

/** Deterministic PRNG (Mulberry32) for Daily 5-Square Challenge */
export function createSeededRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTodayDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function generateDailyPuzzles(dateKey: string): Puzzle[] {
  const rng = createSeededRng(`calmstead-kidsudoku-daily-${dateKey}`);
  const puzzles: Puzzle[] = [];
  let prev: Puzzle | undefined;

  for (let i = 0; i < DAILY_SIZE; i++) {
    const puzzle = generatePuzzle({
      targetSum: 10,
      missingCount: 1,
      previous: prev,
      rng,
      idPrefix: `daily-${dateKey}-${i + 1}`,
    });
    puzzles.push(puzzle);
    prev = puzzle;
  }

  return puzzles;
}

const GENERAL_PRAISE = [
  "Spot on!",
  "Nice thinking!",
  "Well done!",
  "Great match!",
  "Clever!",
  "Lovely!",
];

export function getCelebrationMessage(
  streak: number,
  attempts: number,
  justCompletedSet: boolean,
  targetSum: TargetSum = 10,
): string {
  if (justCompletedSet) {
    return "Set complete! 5 stars earned!";
  }
  if (streak > 0 && streak % 10 === 0) {
    return `${streak} in a row — remarkable!`;
  }
  if (streak === 3 || streak === 5 || streak === 7) {
    return `${streak} in a row!`;
  }
  if (attempts === 1 && streak >= 2) {
    return "First try — sharp!";
  }
  if (streak % 3 === 1) {
    return `Makes ${targetSum}!`;
  }
  return GENERAL_PRAISE[streak % GENERAL_PRAISE.length];
}

export function getWrongFeedback(evaluation: GuessEvaluation): string {
  if (evaluation.status === "too-high") {
    return `That makes ${evaluation.total} — try a smaller number`;
  }
  return `That makes ${evaluation.total} — try a bigger number`;
}
