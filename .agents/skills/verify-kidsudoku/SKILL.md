---
name: verify-kidsudoku
description: Drive and verify the live KidSudoku web UI in headless Playwright via scripts/control-kidsudoku.mjs. Use after visual, layout, mode, theme, or gameplay changes to prove live behavior before finishing.
---

# Verify KidSudoku

Runs live headless browser verification against a running KidSudoku dev or preview server via `scripts/control-kidsudoku.mjs`.

For the feature-to-proof matrix, read [`references/features.md`](references/features.md).

## Steps

1. Confirm the server responds at `http://localhost:5173/` (or start `just dev` / `just preview` on an available port and pass `--url`).
2. Run the targeted command or full suite:
   ```bash
   just verify-ui all
   ```
   Or target a single slice:
   - `just verify-ui smoke` — all 4 discovered modes + Settings modal, zero console/page errors
   - `just verify-ui solve-2x2` — solves a 2×2 square, asserts floating win equation (`= 10`), bottom `Next →` CTA below the NumberPad, and advance back to play controls
   - `just verify-ui solve-sudoku` — completes a 4×4 board, asserts `Every box makes 10!` and `New Board` reset
   - `just verify-ui themes` — switches `warm-paper`, `matcha-garden`, and `cozy-dusk` via Stamp Shelf and checks `data-theme`
   - `just verify-ui mobile` — verifies zero horizontal overflow across all 4 modes at `360×740`
3. Also run `just check` (strict `tsc`, `vp check`, unit + architecture guardrails) and `just build`.

## Completion criteria

- Every targeted `just verify-ui` command prints `PASS` with exit code `0`.
- `just check` and `just build` both pass with zero warnings or errors.
