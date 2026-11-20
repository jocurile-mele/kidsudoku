# 4×4 KidSudoku Bug & UX Report

## Overview

In 4×4 KidSudoku (`src/modes/sudoku-4x4/`), players can get locked into a state where **no digit `1–4` is accepted** for an empty square, with no indication of which earlier tile caused the blockage, and clicking **Hint** fails with a conflict error against the player's own board.

---

## How 4×4 KidSudoku Currently Works

- **Rules:** Standard 4×4 Sudoku — every row, column, and 2×2 box must contain `1, 2, 3, 4` once each (each sums to `10`).
- **Generation (`src/modes/sudoku-4x4/sudoku4x4.ts`):** `generateSudoku4x4()` removes blanks while asserting `countSolutions(givens, 2) === 1`, so every board has **one unique solution** (`puzzle.solution`).
- **Placement validation (`src/modes/sudoku-4x4/Sudoku4x4View.tsx`):** `handlePlaceDigit()` only calls `checkSudokuConflict(board, cellIdx, digit)`, which checks for immediate duplicates in the current row, column, or 2×2 box — it does **not** check whether the placement leaves the puzzle solvable or matches `puzzle.solution`.

---

## Reproduction Trace (Dead-End Lockout)

Given this board state (bold = fixed givens, italic = player-placed):

```text
Row 1:  2*  1 | 3   4
Row 2:  4*  3*| 1   2
Row 3:  1*  2 | 4   ?
Row 4:  .   4 | 2   3
```

1. **Row 4** has givens `. 4 | 2 3`, forcing `(Row 4, Col 1) = 1`.
2. Therefore, the unique solution requires `(Row 3, Col 1) = 3`, `(Row 4, Col 1) = 1`, and `(Row 3, Col 4) = 1`.
3. Earlier, the player placed **`1`** in `(Row 3, Col 1)`. Because no duplicate `1` existed yet in Row 3, Col 1, or the bottom-left box, the game accepted it and styled it **sage green** — visually identical to a confirmed correct answer.
4. When the player later reaches `?` at `(Row 3, Col 4)`:
   - `2`, `3`, and `4` are rejected because they already exist in the bottom-right 2×2 box.
   - `1` is rejected because of the earlier player-placed green `1` in `(Row 3, Col 1)`.
5. Every digit `1–4` is now refused, leaving the player stuck with no visual cue pointing to `(Row 3, Col 1)` as the actual mistake.

---

## Concrete Code Defects

### 1. Green styling implies verified correctness (`src/modes/sudoku-4x4/Sudoku4x4Board.tsx`)

Player-placed digits are always styled with `border-sage/55 text-sage-deep`, and completed 2×2 boxes glow sage (`bg-sage-wash/55 border-sage/45`) whenever four unique digits are placed — even if one or more digits contradict `puzzle.solution`. In 2×2 Make-Sum modes, sage green always means _verified correct_, so players reasonably trust green tiles in 4×4 mode as locked-in truth.

### 2. `Hint` self-conflicts once a mistake exists (`src/modes/sudoku-4x4/sudoku4x4.ts`, `Sudoku4x4View.tsx`)

`getSudokuHint(puzzle, board)` selects the empty cell with the fewest valid candidates and returns `{ index, digit: puzzle.solution[index] }`. `handleHint()` then feeds that digit directly into `handlePlaceDigit()`, which runs `checkSudokuConflict()`.

When a mistaken player-placed tile blocks `puzzle.solution[index]` (such as `(Row 3, Col 1) = 1` blocking `(Row 3, Col 4) = 1`), clicking **Hint** triggers a red conflict error (`"There is already a 1 in this row"`) instead of helping the player recover.

---

## Proposed Fix Options

### Option A — Kid-Friendly Immediate Check (Recommended for KidSudoku)

Validate placements against `puzzle.solution[cellIdx]` (since every board has a guaranteed unique solution):

- **Direct duplicate in row/col/box:** Keep the specific conflict message and tile shake (`"There is already a 4 in this 2×2 square"`).
- **Locally valid, globally wrong digit:** Reject gently before locking it onto the board with a clear, kid-friendly cue (e.g., `"1 belongs in a different spot — try another number here"`) + shake on the selected square.
- **Outcome:**
  - Sage green **always** means 100% correct across every mode in the app.
  - Kids can never paint themselves into an unsolvable dead end.
  - **Hint** can never self-conflict.

### Option B — Classic Sudoku (Allow Guesses, Fix Visuals & Recovery)

Keep open-ended guessing while removing the misleading UI and broken hint recovery:

- Style player-placed digits in a neutral color (e.g. slate/ink-soft, distinct from givens and distinct from solved green) until the entire board is solved.
- Allow tapping a filled player cell and tapping a new number to overwrite it without requiring the Erase key first.
- Update `getSudokuHint(puzzle, board)` to detect any player-placed cell where `board[i] !== puzzle.solution[i]` and either highlight/clear or correct that blocking cell first with an explanatory message (`"This square was blocking the board — fixed!"`).

---

## Verification Plan (Once Option Is Chosen)

1. **Unit tests (`src/modes/sudoku-4x4/sudoku4x4.test.ts`):**
   - Reproduce the exact Row-3/Row-4 dead-end board state.
   - Assert either immediate dead-end prevention (Option A) or mistake-aware `getSudokuHint` recovery (Option B) never produces a self-conflicting hint.
2. **Browser verification (`scripts/control-kidsudoku.mjs`):**
   - Extend `solve-sudoku` to test placing a wrong-but-non-conflicting digit and verify recovery/feedback behavior live in Chromium.
3. **Full check:** Run `just check`, `just build`, and `just verify-ui all`.
