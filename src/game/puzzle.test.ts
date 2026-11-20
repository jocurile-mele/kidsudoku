import { describe, expect, it } from 'vite-plus/test';
import {
  ALL_COMPOSITIONS,
  DAILY_SIZE,
  TARGET_SUM,
  evaluateGuess,
  evaluateMultiGuess,
  generateDailyPuzzles,
  generatePuzzle,
  getCompositions,
  getHintChoices,
  getWrongFeedback,
  type Puzzle,
  type TargetSum,
} from './puzzle';

describe('puzzle generation & rules', () => {
  it('enumerates exact weak compositions for 5, 10, and 20', () => {
    expect(getCompositions(5)).toHaveLength(56);
    expect(ALL_COMPOSITIONS).toHaveLength(286);
    expect(getCompositions(20)).toHaveLength(1771);

    for (const tuple of ALL_COMPOSITIONS) {
      expect(tuple).toHaveLength(4);
      expect(tuple[0] + tuple[1] + tuple[2] + tuple[3]).toBe(TARGET_SUM);
    }
  });

  it('always produces valid 1-missing puzzles across target sums 5, 10, and 20', () => {
    for (const targetSum of [5, 10, 20] as TargetSum[]) {
      let sawZero = false;
      let sawRepeat = false;
      const seenMissingIndices = new Set<number>();

      for (let i = 0; i < 120; i++) {
        const puzzle = generatePuzzle({ targetSum, missingCount: 1 });
        expect(puzzle.targetSum).toBe(targetSum);
        expect(puzzle.cells.filter((c) => c === null)).toHaveLength(1);
        expect(puzzle.cells[puzzle.missingIndex]).toBeNull();
        seenMissingIndices.add(puzzle.missingIndex);

        const givenSum = puzzle.givenEntries.reduce((acc, e) => acc + e.value, 0);
        expect(givenSum).toBe(puzzle.givenSum);
        expect(givenSum + puzzle.answer).toBe(targetSum);
        expect(puzzle.answer).toBeGreaterThanOrEqual(0);
        expect(puzzle.answer).toBeLessThanOrEqual(targetSum);

        const allFour = puzzle.cells.map((c) => (c === null ? puzzle.answer : c));
        if (allFour.includes(0)) sawZero = true;
        if (new Set(allFour).size < 4) sawRepeat = true;
      }

      expect(sawZero).toBe(true);
      expect(sawRepeat).toBe(true);
      expect(seenMissingIndices.size).toBe(4);
    }
  });

  it('supports open-ended 2-missing puzzles where any valid pair wins', () => {
    const puzzle = generatePuzzle({ targetSum: 10, missingCount: 2 });
    expect(puzzle.missingCount).toBe(2);
    expect(puzzle.missingIndices).toHaveLength(2);
    expect(puzzle.cells.filter((c) => c === null)).toHaveLength(2);
    expect(puzzle.givenEntries).toHaveLength(2);

    const [idxA, idxB] = puzzle.missingIndices;
    expect(evaluateMultiGuess(puzzle, { [idxA]: 0 })).toBeNull();

    const rem = puzzle.neededSum;
    const validEval = evaluateMultiGuess(puzzle, { [idxA]: 0, [idxB]: rem });
    expect(validEval?.status).toBe('correct');
    expect(validEval?.total).toBe(10);

    if (rem >= 1) {
      const altEval = evaluateMultiGuess(puzzle, { [idxA]: 1, [idxB]: rem - 1 });
      expect(altEval?.status).toBe('correct');
    }

    const highEval = evaluateMultiGuess(puzzle, { [idxA]: rem + 1, [idxB]: 0 });
    expect(highEval?.status).toBe('too-high');
  });

  it('generates deterministic Daily 5-Square Challenge sets per date', () => {
    const runA = generateDailyPuzzles('2026-04-12');
    const runB = generateDailyPuzzles('2026-04-12');
    const otherDay = generateDailyPuzzles('2026-04-13');

    expect(runA).toHaveLength(DAILY_SIZE);
    expect(runA.map((p) => p.cells)).toEqual(runB.map((p) => p.cells));
    expect(runA.map((p) => p.cells)).not.toEqual(otherDay.map((p) => p.cells));
  });

  it('evaluates guesses accurately including 0 and target boundaries', () => {
    const puzzleZeroAnswer: Puzzle = {
      id: 'p1',
      targetSum: 10,
      missingCount: 1,
      cells: [4, 3, 3, null],
      missingIndices: [3],
      missingIndex: 3,
      answer: 0,
      neededSum: 0,
      givenSum: 10,
      givenEntries: [
        { index: 0, value: 4 },
        { index: 1, value: 3 },
        { index: 2, value: 3 },
      ],
    };

    expect(evaluateGuess(puzzleZeroAnswer, 0).status).toBe('correct');
    const highEval = evaluateGuess(puzzleZeroAnswer, 2);
    expect(highEval.status).toBe('too-high');
    expect(getWrongFeedback(highEval)).toContain('12');
  });

  it('returns 3 unique sorted hint choices including the answer at edges', () => {
    for (const answer of [0, 1, 5, 9, 10]) {
      const puzzle: Puzzle = {
        id: `edge-${answer}`,
        targetSum: 10,
        missingCount: 1,
        cells: [10 - answer, 0, 0, null],
        missingIndices: [3],
        missingIndex: 3,
        answer,
        neededSum: answer,
        givenSum: 10 - answer,
        givenEntries: [
          { index: 0, value: 10 - answer },
          { index: 1, value: 0 },
          { index: 2, value: 0 },
        ],
      };

      const choices = getHintChoices(puzzle);
      expect(choices).toHaveLength(3);
      expect(new Set(choices).size).toBe(3);
      expect(choices).toContain(answer);
      expect(choices).toEqual([...choices].sort((a, b) => a - b));
    }
  });
});
