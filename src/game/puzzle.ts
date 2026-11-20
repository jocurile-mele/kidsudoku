export const TARGET_SUM = 10;
export const MAX_DIGIT = 10;
export const SET_SIZE = 5;

export type QuadrantIndex = 0 | 1 | 2 | 3;

export interface Puzzle {
  id: string;
  cells: [number | null, number | null, number | null, number | null];
  missingIndex: QuadrantIndex;
  answer: number;
  givenSum: number;
  givenEntries: Array<{ index: QuadrantIndex; value: number }>;
}

export type GuessStatus = 'correct' | 'too-high' | 'too-low';

export interface GuessEvaluation {
  status: GuessStatus;
  guess: number;
  total: number;
  diff: number;
}

type QuadTuple = readonly [number, number, number, number];

/**
 * All 286 weak compositions of TARGET_SUM (10) into 4 non-negative integers.
 * Precomputing guarantees exact uniform random sampling with repeats and 0 allowed.
 */
export const ALL_COMPOSITIONS: readonly QuadTuple[] = (() => {
  const result: QuadTuple[] = [];
  for (let a = 0; a <= TARGET_SUM; a++) {
    for (let b = 0; b <= TARGET_SUM - a; b++) {
      for (let c = 0; c <= TARGET_SUM - a - b; c++) {
        const d = TARGET_SUM - a - b - c;
        result.push([a, b, c, d] as const);
      }
    }
  }
  return result;
})();

let nextPuzzleCounter = 1;

function randomInt(maxExclusive: number, rng: () => number): number {
  return Math.min(maxExclusive - 1, Math.floor(rng() * maxExclusive));
}

function cellsSignature(cells: Puzzle['cells']): string {
  return cells.map((c) => (c === null ? '?' : String(c))).join(',');
}

export function generatePuzzle(
  previous?: Puzzle,
  rng: () => number = Math.random,
): Puzzle {
  let chosenTuple: QuadTuple = ALL_COMPOSITIONS[0];
  let missingIndex: QuadrantIndex = 0;

  for (let attempt = 0; attempt < 12; attempt++) {
    chosenTuple = ALL_COMPOSITIONS[randomInt(ALL_COMPOSITIONS.length, rng)];
    missingIndex = randomInt(4, rng) as QuadrantIndex;

    if (!previous) break;

    const candidateCells: Puzzle['cells'] = [
      missingIndex === 0 ? null : chosenTuple[0],
      missingIndex === 1 ? null : chosenTuple[1],
      missingIndex === 2 ? null : chosenTuple[2],
      missingIndex === 3 ? null : chosenTuple[3],
    ];

    const sameBoard =
      cellsSignature(candidateCells) === cellsSignature(previous.cells);
    const sameSpotAndAnswer =
      missingIndex === previous.missingIndex &&
      chosenTuple[missingIndex] === previous.answer;

    if (!sameBoard && !sameSpotAndAnswer) {
      break;
    }
  }

  const cells: Puzzle['cells'] = [
    missingIndex === 0 ? null : chosenTuple[0],
    missingIndex === 1 ? null : chosenTuple[1],
    missingIndex === 2 ? null : chosenTuple[2],
    missingIndex === 3 ? null : chosenTuple[3],
  ];

  const answer = chosenTuple[missingIndex];
  const givenSum = TARGET_SUM - answer;
  const givenEntries: Array<{ index: QuadrantIndex; value: number }> = [];

  for (let i = 0; i < 4; i++) {
    const val = cells[i];
    if (val !== null) {
      givenEntries.push({ index: i as QuadrantIndex, value: val });
    }
  }

  return {
    id: `puzzle-${Date.now()}-${nextPuzzleCounter++}`,
    cells,
    missingIndex,
    answer,
    givenSum,
    givenEntries,
  };
}

export function evaluateGuess(puzzle: Puzzle, guess: number): GuessEvaluation {
  const total = puzzle.givenSum + guess;
  const diff = total - TARGET_SUM;

  if (diff === 0) {
    return { status: 'correct', guess, total, diff };
  }

  return {
    status: diff > 0 ? 'too-high' : 'too-low',
    guess,
    total,
    diff,
  };
}

/**
 * Returns 3 distinct choices (including the correct answer) for gentle Hint Level 2.
 */
export function getHintChoices(
  puzzle: Puzzle,
  rng: () => number = Math.random,
): number[] {
  const answer = puzzle.answer;
  const candidates: number[] = [];

  for (const delta of [-2, -1, 1, 2, -3, 3]) {
    const val = answer + delta;
    if (val >= 0 && val <= MAX_DIGIT && !candidates.includes(val)) {
      candidates.push(val);
    }
  }

  // Pick 2 nearby distractors
  const pool = [...candidates];
  const picked = new Set<number>([answer]);

  while (picked.size < 3 && pool.length > 0) {
    const idx = randomInt(Math.min(pool.length, 4), rng);
    picked.add(pool.splice(idx, 1)[0]);
  }

  return Array.from(picked).sort((a, b) => a - b);
}

const GENERAL_PRAISE = [
  'Makes 10!',
  'Spot on!',
  'Nice thinking!',
  'Well done!',
  'Great match!',
  'Clever!',
];

export function getCelebrationMessage(
  streak: number,
  attempts: number,
  justCompletedSet: boolean,
): string {
  if (justCompletedSet) {
    return 'Set complete! 5 stars earned!';
  }
  if (streak > 0 && streak % 10 === 0) {
    return `${streak} in a row — remarkable!`;
  }
  if (streak === 3 || streak === 5 || streak === 7) {
    return `${streak} in a row!`;
  }
  if (attempts === 1 && streak >= 2) {
    return 'First try — sharp!';
  }
  return GENERAL_PRAISE[streak % GENERAL_PRAISE.length];
}

export function getWrongFeedback(evaluation: GuessEvaluation): string {
  if (evaluation.status === 'too-high') {
    return `That makes ${evaluation.total} — try a smaller number`;
  }
  return `That makes ${evaluation.total} — try a bigger number`;
}
