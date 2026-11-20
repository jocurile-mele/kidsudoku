#!/usr/bin/env node
/**
 * Blessed Dune scaffold for creating a new KidSudoku game mode.
 *
 * Usage:
 *   just new-mode <slug>
 *   node scripts/new-mode.mjs <slug>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawSlug = process.argv[2]?.trim() ?? "";

if (!/^[a-z][a-z0-9-]{1,31}$/.test(rawSlug)) {
  console.error("Usage: node scripts/new-mode.mjs <slug>");
  console.error("Slug must be lowercase letters, numbers, and hyphens (e.g. 'make-100').");
  process.exit(1);
}

const pascal = rawSlug
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join("");

const modeDir = path.join(ROOT, "src", "modes", rawSlug);
if (fs.existsSync(modeDir)) {
  console.error(`Mode directory already exists: src/modes/${rawSlug}`);
  process.exit(1);
}

fs.mkdirSync(modeDir, { recursive: true });

const viewFile = path.join(modeDir, `${pascal}View.tsx`);
const modeFile = path.join(modeDir, "mode.tsx");
const testFile = path.join(modeDir, `${rawSlug}.test.ts`);

fs.writeFileSync(
  viewFile,
  `import { useEffect } from "react";
import type { GameModeProps } from "../contract";

export function ${pascal}View({ onProgressSnapshot }: GameModeProps) {
  useEffect(() => {
    onProgressSnapshot({
      starsInSet: 0,
      setSize: 5,
      dailyLabel: null,
    });
  }, [onProgressSnapshot]);

  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-4 flex flex-col items-center justify-center gap-3 py-4">
      <div className="rounded-3xl cs-surface border p-6 text-center">
        <h2 className="font-display text-2xl font-bold text-ink">${pascal}</h2>
        <p className="text-sm font-semibold text-ink-soft mt-1">
          Implement ${rawSlug} gameplay inside src/modes/${rawSlug}/.
        </p>
      </div>
    </main>
  );
}
`,
  "utf8",
);

fs.writeFileSync(
  modeFile,
  `import { Sparkles } from "lucide-react";
import type { GameModeDefinition } from "../contract";
import { ${pascal}View } from "./${pascal}View";

export const mode: GameModeDefinition = {
  id: "${rawSlug}",
  label: "${pascal}",
  shortLabel: "${pascal}",
  order: 50,
  supportsTargetSum: false,
  renderIcon: () => <Sparkles className="w-3.5 h-3.5" />,
  Component: ${pascal}View,
};
`,
  "utf8",
);

fs.writeFileSync(
  testFile,
  `import { describe, expect, it } from "vite-plus/test";
import { mode } from "./mode";

describe("${rawSlug} mode contract", () => {
  it("exports a valid GameModeDefinition matching its folder slug", () => {
    expect(mode.id).toBe("${rawSlug}");
    expect(mode.shortLabel.length).toBeGreaterThan(0);
    expect(typeof mode.Component).toBe("function");
  });
});
`,
  "utf8",
);

console.log(`Created owned mode folder src/modes/${rawSlug}/:`);
console.log(`  - src/modes/${rawSlug}/mode.tsx`);
console.log(`  - src/modes/${rawSlug}/${pascal}View.tsx`);
console.log(`  - src/modes/${rawSlug}/${rawSlug}.test.ts`);
console.log("Auto-discovered by src/modes/index.ts — zero edits to App.tsx or ModeBar.tsx needed.");
