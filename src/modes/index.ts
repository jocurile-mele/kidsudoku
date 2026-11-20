import type { GameModeDefinition } from "./contract";

interface ModeModule {
  mode: GameModeDefinition;
}

const discovered = import.meta.glob<ModeModule>("./*/mode.{ts,tsx}", {
  eager: true,
});

const loadedModes: GameModeDefinition[] = Object.entries(discovered).map(([path, mod]) => {
  if (!mod.mode) {
    throw new Error(`Mode entrypoint ${path} must export a named \`mode: GameModeDefinition\`.`);
  }
  return mod.mode;
});

loadedModes.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

const seenIds = new Set<string>();
for (const m of loadedModes) {
  if (seenIds.has(m.id)) {
    throw new Error(`Duplicate game mode id "${m.id}" discovered under src/modes/.`);
  }
  seenIds.add(m.id);
}

export const GAME_MODES: readonly GameModeDefinition[] = loadedModes;
export const DEFAULT_MODE_ID: string = GAME_MODES[0]?.id ?? "classic";

export function getGameMode(id: string): GameModeDefinition {
  const found = GAME_MODES.find((m) => m.id === id);
  if (found) return found;
  if (!GAME_MODES[0]) {
    throw new Error("No game modes discovered under src/modes/*/mode.{ts,tsx}.");
  }
  return GAME_MODES[0];
}
