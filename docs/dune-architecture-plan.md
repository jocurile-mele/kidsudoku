# Dune Architecture Plan for KidSudoku

Applying the [Dune Method](https://raw.githubusercontent.com/Dahhrk/dark-factory/refs/heads/main/docs/dune-method.md) contract to `kidsudoku`:

> Make the locally obvious change the globally correct change. Unsafe shortcuts fail mechanically with an error naming the supported owner.

---

## Current Baseline & Pain Points

As of commit `13cfed3` (~4.9k LOC across 23 files):

- **Shared-root growth (`src/App.tsx` = 1,293 lines):** Adding Make 5/10/20, 2-Blank, Daily 5, and 4×4 KidSudoku added `if (mode === ...)` branches across state hooks, keyboard handlers, hint/skip logic, `NumberPad` props, feedback rendering, and action controls. Adding another mode currently requires editing 12+ branches in `App.tsx`.
- **Multiple write sites for durable state:** `src/game/storage.ts` is the sole `localStorage` adapter, but `progress` mutations (`setProgress`) plus `getTotalRewardCount` / `showStampToastIfUnlocked` checks are repeated across 7 sites in `src/App.tsx`.
- **Unenforced layer boundaries:** `src/game/` mixes pure domain engines (`puzzle.ts`, `sudoku4x4.ts`) with browser side effects (`sound.ts`, `confetti.ts`, `storage.ts`) and reward metadata (`stamps.ts`). Nothing in `just check` prevents components or modes from calling `localStorage`, `AudioContext`, or another mode's internals directly.
- **Soft-only conventions:** Audio synthesis guidance lives in `.agents/skills/web-audio-sfx/SKILL.md` (Layer 3 — soft), with no mechanical test guarding parallel harmonic routing or headroom.
- **No browser verification driver ("eyes"):** `vp test` verifies pure puzzle/Sudoku math (8 tests), but no CLI or headless browser script exercises live gameplay, win equations, themes, drag-and-drop, or mobile viewports.

---

## Target Architecture (One-Way Layers + Owned Modes)

```text
src/
├── platform/            # Browser/host adapters ONLY (never imports state/, rewards/, ui/, modes/)
│   ├── sound.ts         # Sole AudioContext & HTMLAudioElement owner
│   ├── storage.ts       # Sole localStorage owner
│   ├── confetti.ts      # Sole canvas-confetti owner
│   └── timers.ts        # Managed auto-clearing timeout registry
├── state/               # Single-writer durable state (imports platform/ + rewards/)
│   └── useProgress.ts   # Sole writer for PersistedProgress + automatic stamp-unlock toasts
├── rewards/             # Stamps, themes, StarTrack, StampShelfModal (never imports modes/)
├── ui/                  # Shared stateless/presentational primitives (NumberPad, DominoPips, Header, modals)
├── modes/               # Owned feature folders — one folder per mode
│   ├── contract.ts      # Typed GameModeDefinition contract (id, label, order, Component)
│   ├── index.ts         # Convention discovery via import.meta.glob('./*/mode.ts', { eager: true })
│   ├── make-sum/        # Classic + 2-Blank (puzzle.ts, PuzzleBoard, TenFrameHint, mode.ts)
│   ├── daily/           # Daily 5 runner + completion summary (mode.ts)
│   └── sudoku-4x4/      # sudoku4x4.ts, Sudoku4x4Board, mode.ts
└── App.tsx              # Thin ~120-line shell: Header, ModeBar, active mode, modals
```

### Dependency Direction (Enforced Mechanically)

1. `platform/` → external packages only (never imports any sibling layer).
2. `rewards/` → `platform/` only (never imports `modes/`).
3. `state/` → `platform/`, `rewards/` only.
4. `ui/` → `platform/`, `rewards/` only (never imports `modes/`).
5. `modes/<A>/` → `platform/`, `state/`, `rewards/`, `ui/`, `modes/contract.ts` only — **never `modes/<B>/`** (`A !== B`). Shared 2×2 square primitives used by both `make-sum` and `daily` live in `ui/` or a dedicated shared `src/engine/make-sum/` layer rather than cross-importing between modes.
6. `App.tsx` → `modes/index.ts`, `state/`, `rewards/`, `ui/` only (never imports mode internals).

---

## Mechanical Guardrails (Layers 1 & 2)

Every rule fails `just check` with an error message naming the supported owner:

| Invariant                                              | Enforcement                                        | Owner Named in Error                        |
| ------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------- |
| `localStorage` access                                  | `src/architecture.test.ts` + Oxlint                | `src/platform/storage.ts` / `useProgress()` |
| `AudioContext` / `new Audio`                           | `src/architecture.test.ts`                         | `soundEngine` in `src/platform/sound.ts`    |
| `canvas-confetti` import                               | `src/architecture.test.ts`                         | `src/platform/confetti.ts`                  |
| One-way layer imports & no cross-mode imports          | `src/architecture.test.ts`                         | Target layer owner                          |
| Web Audio parallel harmonic routing & `< 0.8` headroom | `src/platform/sound.test.ts` (mock `AudioContext`) | `src/platform/sound.ts`                     |
| No `any`, no floating promises, strict type-aware lint | `vite.config.ts` (`vp check`)                      | Compiler / Oxlint                           |
| Local pre-commit enforcement                           | `.githooks/pre-commit` (`just setup-hooks`)        | `just check`                                |

### Single-Writer State (`src/state/useProgress.ts`)

Replace raw `setProgress` calls across features with named commands:

- `recordSolve({ mode, completedSet, dailyDateKey })` — atomically updates `totalSolved`, `bestStreak`, `setsCompleted`, `sudoku4x4Solved`, `dailyCompletedDates`, and emits any newly unlocked stamp toast in one place.
- `setTheme(theme)`, `pinStamp(id)`, `toggleSound()`, `togglePips()`, `markRewardsSeen()`.

### Blessed Scaffold (`just new-mode <slug>`)

Add a small generator script (`scripts/new-mode.mjs`) wired to `just new-mode <slug>` that creates:

- `src/modes/<slug>/mode.ts` implementing `GameModeDefinition`
- `src/modes/<slug>/<Slug>View.tsx`
- `src/modes/<slug>/<slug>.test.ts`

Because `src/modes/index.ts` discovers `*/mode.ts` automatically via `import.meta.glob`, adding a mode requires zero edits to `App.tsx` or `ModeBar.tsx`.

---

## Verification & Eyes (`control-kidsudoku`)

Give agents and humans a real headless browser driver rather than relying on manual spot checks:

- **`scripts/control-kidsudoku.mjs`** (Playwright CLI, exposed via `just verify-ui`):
  - `smoke` — loads all modes, verifies zero console/page errors and zero broken assets.
  - `solve-2x2` — completes a 2×2 puzzle, asserts standalone floating equation above the number pad, bottom `Next →` CTA swap (Option A1), and auto-advance completion.
  - `solve-sudoku` — completes a 4×4 board via hints/input and verifies win banner + `New Board →`.
  - `themes` — switches `warm-paper`, `matcha-garden`, `cozy-dusk` and checks `data-theme` + contrast tokens.
  - `mobile` — checks `360×740` viewport for zero horizontal overflow and tap-target sizing.
- **`.agents/skills/verify-kidsudoku/SKILL.md`** + `references/features/` — maps each mode and UI invariant to its exact CLI proof command.

---

## Atomic Implementation Sequence

Keep each step as an independent, green commit/PR (`just check` and `just build` pass after every step):

1. **`arch(test): add architecture and audio guardrail tests`**
   - Add `src/architecture.test.ts` (one-writer checks for `localStorage`, `AudioContext`, `canvas-confetti`; prepares layer boundary assertions).
   - Add `src/game/sound.test.ts` testing parallel harmonic routing and peak gain headroom on `playWrong()` and `playCorrect()`.
   - Add `.githooks/pre-commit` + `just setup-hooks`.
2. **`refactor(state): extract single-writer useProgress hook`**
   - Create `src/state/useProgress.ts` with named commands and centralized stamp-unlock toast emission.
   - Replace all 7 `setProgress` mutation blocks in `src/App.tsx`.
3. **`refactor(platform): isolate browser adapters under src/platform/`**
   - Move `sound.ts`, `storage.ts`, `confetti.ts` into `src/platform/` and add `timers.ts`.
   - Enable strict one-way import assertions for `src/platform/` in `src/architecture.test.ts`.
4. **`refactor(modes): extract modes behind GameModeDefinition and thin App shell`**
   - Extract `make-sum`, `daily`, and `sudoku-4x4` into owned folders under `src/modes/` with `import.meta.glob` discovery.
   - Move shared primitives into `src/ui/` and reward components into `src/rewards/`.
   - Shrink `src/App.tsx` to a ~120-line shell; enforce no cross-mode imports and `App.tsx` boundary in `src/architecture.test.ts`.
   - Add `scripts/new-mode.mjs` + `just new-mode <slug>`.
5. **`feat(verify): add control-kidsudoku Playwright CLI and verification skill`**
   - Add `scripts/control-kidsudoku.mjs`, `just verify-ui`, and `.agents/skills/verify-kidsudoku/SKILL.md`.
