# KidSudoku Feature Map

Maps owned modules and user-facing invariants to their mechanical proof commands.

| Feature / Area                                  | Owner                                               | Proof Command                                                                    |
| ----------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Classic 2×2 (Make 5/10/20) & Option A1 win flow | `src/modes/classic/`, `src/ui/MakeSumSession.tsx`   | `just verify-ui solve-2x2`                                                       |
| 2-Blank mode                                    | `src/modes/two-blank/`, `src/ui/MakeSumSession.tsx` | `just verify-ui smoke` + `vp test src/engine/make-sum/puzzle.test.ts`            |
| Daily 5 mode                                    | `src/modes/daily/`                                  | `just verify-ui smoke` + `vp test src/state/useProgress.test.ts`                 |
| 4×4 KidSudoku mode                              | `src/modes/sudoku-4x4/`                             | `just verify-ui solve-sudoku` + `vp test src/modes/sudoku-4x4/sudoku4x4.test.ts` |
| Paper themes & Stamp Shelf                      | `src/rewards/`, `src/state/useProgress.ts`          | `just verify-ui themes`                                                          |
| Mobile 360px layout                             | `src/ui/`, `src/index.css`                          | `just verify-ui mobile`                                                          |
| Web Audio parallel harmonic routing & loudness  | `src/platform/sound.ts`                             | `vp test src/platform/sound.test.ts`                                             |
| One-way layers, single writers, thin shell      | `tests/architecture.test.ts`                        | `vp test tests/architecture.test.ts`                                             |
