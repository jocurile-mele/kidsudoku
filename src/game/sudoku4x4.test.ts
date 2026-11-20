import { describe, expect, it } from 'vite-plus/test';
import {
  checkSudokuConflict,
  countSolutions,
  generateSudoku4x4,
  getBoxCells,
  getSudokuHint,
  isBoxComplete,
  isSudokuSolved,
} from './sudoku4x4';

describe('4x4 KidSudoku engine', () => {
  it('generates valid unique-solution 4x4 puzzles where every row, col, and 2x2 box sums to 10', () => {
    for (let i = 0; i < 30; i++) {
      const puzzle = generateSudoku4x4();
      expect(puzzle.solution).toHaveLength(16);
      expect(puzzle.givens).toHaveLength(16);

      // Every row, column, and 2x2 box has {1,2,3,4} summing to 10
      for (let r = 0; r < 4; r++) {
        const row = puzzle.solution.slice(r * 4, r * 4 + 4);
        expect(new Set(row).size).toBe(4);
        expect(row.reduce((a, b) => a + b, 0)).toBe(10);
      }
      for (let c = 0; c < 4; c++) {
        const col = [0, 1, 2, 3].map((r) => puzzle.solution[r * 4 + c]);
        expect(new Set(col).size).toBe(4);
        expect(col.reduce((a, b) => a + b, 0)).toBe(10);
      }
      for (let b = 0; b < 4; b++) {
        const box = getBoxCells(b).map((idx) => puzzle.solution[idx]);
        expect(new Set(box).size).toBe(4);
        expect(box.reduce((a, b) => a + b, 0)).toBe(10);
      }

      expect(isSudokuSolved(puzzle.solution)).toBe(true);
      expect(countSolutions(puzzle.givens, 2)).toBe(1);
    }
  });

  it('detects box, row, and column conflicts and provides valid hints', () => {
    const puzzle = generateSudoku4x4();
    const board = [...puzzle.givens];
    const hint = getSudokuHint(puzzle, board);
    expect(hint).not.toBeNull();
    if (!hint) return;

    // Correct digit has no conflict
    expect(checkSudokuConflict(board, hint.index, hint.digit)).toBeNull();

    // Placing full solution completes all 4 boxes
    for (let b = 0; b < 4; b++) {
      expect(isBoxComplete(puzzle.solution, b)).toBe(true);
    }
  });
});
