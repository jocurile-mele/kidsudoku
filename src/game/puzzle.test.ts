import { describe, expect, it } from "vite-plus/test";
import {
  ALL_COMPOSITIONS,
  TARGET_SUM,
  evaluateGuess,
  generatePuzzle,
  getHintChoices,
  getWrongFeedback,
  type Puzzle,
} from "./puzzle";

describe("puzzle generation & rules", () => {
  it("enumerates all 286 weak compositions of 10 into 4 parts", () => {
    expect(ALL_COMPOSITIONS).toHaveLength(286);
    for (const tuple of ALL_COMPOSITIONS) {
      expect(tuple).toHaveLength(4);
      for (const n of tuple) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(TARGET_SUM);
        expect(Number.isInteger(n)).toBe(true);
      }
      expect(tuple[0] + tuple[1] + tuple[2] + tuple[3]).toBe(TARGET_SUM);
    }
  });

  it("always produces a valid 2x2 puzzle with 3 given quadrants summing with answer to 10", () => {
    let sawZero = false;
    let sawRepeat = false;
    const seenMissingIndices = new Set<number>();

    for (let i = 0; i < 300; i++) {
      const puzzle = generatePuzzle();
      const nullCount = puzzle.cells.filter((c) => c === null).length;
      expect(nullCount).toBe(1);
      expect(puzzle.cells[puzzle.missingIndex]).toBeNull();
      seenMissingIndices.add(puzzle.missingIndex);

      const givenSum = puzzle.givenEntries.reduce((acc, e) => acc + e.value, 0);
      expect(puzzle.givenEntries).toHaveLength(3);
      expect(givenSum).toBe(puzzle.givenSum);
      expect(givenSum + puzzle.answer).toBe(TARGET_SUM);
      expect(puzzle.answer).toBeGreaterThanOrEqual(0);
      expect(puzzle.answer).toBeLessThanOrEqual(TARGET_SUM);

      const allFour = puzzle.cells.map((c) => (c === null ? puzzle.answer : c));
      if (allFour.includes(0)) sawZero = true;
      if (new Set(allFour).size < 4) sawRepeat = true;
    }

    expect(sawZero).toBe(true);
    expect(sawRepeat).toBe(true);
    expect(seenMissingIndices.size).toBe(4);
  });

  it("avoids repeating the exact same board back-to-back", () => {
    let prev = generatePuzzle();
    for (let i = 0; i < 100; i++) {
      const next = generatePuzzle(prev);
      expect(next.cells).not.toEqual(prev.cells);
      prev = next;
    }
  });

  it("evaluates guesses accurately including 0 and 10 boundaries", () => {
    const puzzleZeroAnswer: Puzzle = {
      id: "p1",
      cells: [4, 3, 3, null],
      missingIndex: 3,
      answer: 0,
      givenSum: 10,
      givenEntries: [
        { index: 0, value: 4 },
        { index: 1, value: 3 },
        { index: 2, value: 3 },
      ],
    };

    expect(evaluateGuess(puzzleZeroAnswer, 0)).toEqual({
      status: "correct",
      guess: 0,
      total: 10,
      diff: 0,
    });
    const highEval = evaluateGuess(puzzleZeroAnswer, 2);
    expect(highEval.status).toBe("too-high");
    expect(highEval.total).toBe(12);
    expect(getWrongFeedback(highEval)).toContain("12");

    const puzzleTenAnswer: Puzzle = {
      id: "p2",
      cells: [null, 0, 0, 0],
      missingIndex: 0,
      answer: 10,
      givenSum: 0,
      givenEntries: [
        { index: 1, value: 0 },
        { index: 2, value: 0 },
        { index: 3, value: 0 },
      ],
    };

    expect(evaluateGuess(puzzleTenAnswer, 10).status).toBe("correct");
    const lowEval = evaluateGuess(puzzleTenAnswer, 7);
    expect(lowEval.status).toBe("too-low");
    expect(lowEval.total).toBe(7);
    expect(getWrongFeedback(lowEval)).toContain("7");
  });

  it("returns 3 unique valid sorted hint choices including the answer at edges", () => {
    for (const answer of [0, 1, 5, 9, 10]) {
      const puzzle: Puzzle = {
        id: `edge-${answer}`,
        cells: [TARGET_SUM - answer, 0, 0, null],
        missingIndex: 3,
        answer,
        givenSum: TARGET_SUM - answer,
        givenEntries: [
          { index: 0, value: TARGET_SUM - answer },
          { index: 1, value: 0 },
          { index: 2, value: 0 },
        ],
      };

      const choices = getHintChoices(puzzle);
      expect(choices).toHaveLength(3);
      expect(new Set(choices).size).toBe(3);
      expect(choices).toContain(answer);
      expect(choices).toEqual([...choices].sort((a, b) => a - b));
      for (const c of choices) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(10);
      }
    }
  });
});
