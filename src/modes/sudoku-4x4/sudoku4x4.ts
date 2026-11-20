export interface Sudoku4x4Puzzle {
  id: string;
  /** 16 cells (row-major 0..15). null = empty cell to solve */
  givens: Array<number | null>;
  /** Full valid 4x4 solution (digits 1..4) */
  solution: number[];
}

export interface SudokuConflict {
  digit: number;
  reason: "row" | "col" | "box";
  conflictingIndices: number[];
  message: string;
}

const BOX_CELLS: readonly (readonly number[])[] = [
  [0, 1, 4, 5],
  [2, 3, 6, 7],
  [8, 9, 12, 13],
  [10, 11, 14, 15],
];

export function getRow(index: number): number {
  return Math.floor(index / 4);
}

export function getCol(index: number): number {
  return index % 4;
}

export function getBoxIndex(index: number): number {
  return Math.floor(getRow(index) / 2) * 2 + Math.floor(getCol(index) / 2);
}

export function getBoxCells(boxIndex: number): readonly number[] {
  return BOX_CELLS[boxIndex];
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValidPlacement(grid: Array<number | null>, index: number, digit: number): boolean {
  const row = getRow(index);
  const col = getCol(index);
  const box = getBoxIndex(index);

  for (let c = 0; c < 4; c++) {
    const idx = row * 4 + c;
    if (idx !== index && grid[idx] === digit) return false;
  }
  for (let r = 0; r < 4; r++) {
    const idx = r * 4 + col;
    if (idx !== index && grid[idx] === digit) return false;
  }
  for (const idx of BOX_CELLS[box]) {
    if (idx !== index && grid[idx] === digit) return false;
  }
  return true;
}

function generateFullSolution(rng: () => number): number[] {
  const grid: Array<number | null> = Array(16).fill(null);

  function backtrack(pos: number): boolean {
    if (pos === 16) return true;
    const digits = shuffle([1, 2, 3, 4], rng);
    for (const d of digits) {
      if (isValidPlacement(grid, pos, d)) {
        grid[pos] = d;
        if (backtrack(pos + 1)) return true;
        grid[pos] = null;
      }
    }
    return false;
  }

  backtrack(0);
  return grid as number[];
}

export function countSolutions(grid: Array<number | null>, limit = 2): number {
  const work = [...grid];
  let count = 0;

  function solve(): void {
    if (count >= limit) return;

    // Pick empty cell with fewest candidates
    let bestIdx = -1;
    let bestCandidates: number[] = [];

    for (let i = 0; i < 16; i++) {
      if (work[i] !== null) continue;
      const cands: number[] = [];
      for (let d = 1; d <= 4; d++) {
        if (isValidPlacement(work, i, d)) cands.push(d);
      }
      if (cands.length === 0) return;
      if (bestIdx === -1 || cands.length < bestCandidates.length) {
        bestIdx = i;
        bestCandidates = cands;
        if (cands.length === 1) break;
      }
    }

    if (bestIdx === -1) {
      count++;
      return;
    }

    for (const d of bestCandidates) {
      work[bestIdx] = d;
      solve();
      work[bestIdx] = null;
      if (count >= limit) return;
    }
  }

  solve();
  return count;
}

let nextSudokuId = 1;

export function generateSudoku4x4(
  rng: () => number = Math.random,
  targetBlanks = 7,
): Sudoku4x4Puzzle {
  const solution = generateFullSolution(rng);
  const givens: Array<number | null> = [...solution];
  const order = shuffle(
    Array.from({ length: 16 }, (_, i) => i),
    rng,
  );

  let removed = 0;
  for (const idx of order) {
    if (removed >= targetBlanks) break;
    const backup = givens[idx];
    givens[idx] = null;
    if (countSolutions(givens, 2) === 1) {
      removed++;
    } else {
      givens[idx] = backup;
    }
  }

  return {
    id: `sudoku4x4-${Date.now()}-${nextSudokuId++}`,
    givens,
    solution,
  };
}

export function checkSudokuConflict(
  board: Array<number | null>,
  index: number,
  digit: number,
): SudokuConflict | null {
  const row = getRow(index);
  const col = getCol(index);
  const box = getBoxIndex(index);

  const boxConflicts = BOX_CELLS[box].filter((idx) => idx !== index && board[idx] === digit);
  if (boxConflicts.length > 0) {
    return {
      digit,
      reason: "box",
      conflictingIndices: boxConflicts,
      message: `There is already a ${digit} in this 2×2 square`,
    };
  }

  const rowConflicts: number[] = [];
  for (let c = 0; c < 4; c++) {
    const idx = row * 4 + c;
    if (idx !== index && board[idx] === digit) rowConflicts.push(idx);
  }
  if (rowConflicts.length > 0) {
    return {
      digit,
      reason: "row",
      conflictingIndices: rowConflicts,
      message: `There is already a ${digit} in this row`,
    };
  }

  const colConflicts: number[] = [];
  for (let r = 0; r < 4; r++) {
    const idx = r * 4 + col;
    if (idx !== index && board[idx] === digit) colConflicts.push(idx);
  }
  if (colConflicts.length > 0) {
    return {
      digit,
      reason: "col",
      conflictingIndices: colConflicts,
      message: `There is already a ${digit} in this column`,
    };
  }

  return null;
}

export function isBoxComplete(board: Array<number | null>, boxIndex: number): boolean {
  const vals = BOX_CELLS[boxIndex].map((idx) => board[idx]);
  if (vals.some((v) => v === null)) return false;
  return new Set(vals).size === 4;
}

export function isSudokuSolved(board: Array<number | null>): boolean {
  for (let i = 0; i < 16; i++) {
    const v = board[i];
    if (v === null || v < 1 || v > 4) return false;
    if (checkSudokuConflict(board, i, v) !== null) return false;
  }
  return true;
}

export function getSudokuHint(
  puzzle: Sudoku4x4Puzzle,
  board: Array<number | null>,
): { index: number; digit: number } | null {
  // Prefer an empty cell with only 1 valid candidate, or fewest candidates
  let bestIdx = -1;
  let bestCandCount = 5;

  for (let i = 0; i < 16; i++) {
    if (board[i] !== null) continue;
    let cands = 0;
    for (let d = 1; d <= 4; d++) {
      if (isValidPlacement(board, i, d)) cands++;
    }
    if (cands < bestCandCount) {
      bestCandCount = cands;
      bestIdx = i;
    }
  }

  if (bestIdx === -1) return null;
  return { index: bestIdx, digit: puzzle.solution[bestIdx] };
}
