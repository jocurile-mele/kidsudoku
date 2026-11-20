import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "src");

function walkSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      results.push(full);
    }
  }
  return results;
}

function rel(filePath: string): string {
  return path.relative(ROOT, filePath).replaceAll("\\", "/");
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

function extractImports(source: string): string[] {
  const imports: string[] = [];
  const regex = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  for (const match of stripComments(source).matchAll(regex)) {
    if (match[1]) imports.push(match[1]);
  }
  return imports;
}

function resolveRelativeImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const resolved = path.resolve(path.dirname(fromFile), specifier);
  return rel(resolved);
}

function getModeSlug(relPath: string): string | null {
  const match = /^src\/modes\/([^/]+)\//.exec(relPath);
  return match ? match[1] : null;
}

describe("architecture guardrails (Dune contract)", () => {
  const sourceFiles = walkSourceFiles(SRC_DIR);

  it("enforces one-way imports: src/platform/ never imports application layers", () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const r = rel(file);
      if (!r.startsWith("src/platform/")) continue;
      const content = fs.readFileSync(file, "utf8");
      for (const spec of extractImports(content)) {
        const target = resolveRelativeImport(file, spec);
        if (!target) continue;
        if (target.startsWith("src/") && !target.startsWith("src/platform/")) {
          violations.push(
            `${r} imports ${target} — src/platform/ is a bottom-layer adapter and must never depend on application code.`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("enforces one-way imports: src/engine/ never imports platform, state, rewards, ui, or modes", () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const r = rel(file);
      if (!r.startsWith("src/engine/")) continue;
      const content = fs.readFileSync(file, "utf8");
      for (const spec of extractImports(content)) {
        const target = resolveRelativeImport(file, spec);
        if (!target) continue;
        if (target.startsWith("src/") && !target.startsWith("src/engine/")) {
          violations.push(
            `${r} imports ${target} — src/engine/ must remain pure domain logic without browser or UI dependencies.`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("forbids src/rewards/ and src/ui/ from importing src/modes/ or src/App", () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const r = rel(file);
      if (!r.startsWith("src/rewards/") && !r.startsWith("src/ui/")) continue;
      const content = fs.readFileSync(file, "utf8");
      for (const spec of extractImports(content)) {
        const target = resolveRelativeImport(file, spec);
        if (!target) continue;
        if (target.startsWith("src/modes/") || target === "src/modes" || target === "src/App") {
          violations.push(
            `${r} imports ${target} — shared rewards/ui layers must never depend on modes or App.`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("forbids cross-mode imports between owned folders under src/modes/<slug>/", () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const r = rel(file);
      const ownerSlug = getModeSlug(r);
      if (!ownerSlug) continue;
      const content = fs.readFileSync(file, "utf8");
      for (const spec of extractImports(content)) {
        const target = resolveRelativeImport(file, spec);
        if (!target) continue;
        const targetSlug = getModeSlug(target);
        if (targetSlug && targetSlug !== ownerSlug) {
          violations.push(
            `${r} imports ${target} — modes/${ownerSlug} must not import modes/${targetSlug}; lift shared primitives to src/ui/ or src/engine/.`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps src/App.tsx a thin shell without direct mode or engine imports", () => {
    const appPath = path.join(SRC_DIR, "App.tsx");
    const content = fs.readFileSync(appPath, "utf8");
    const lineCount = content.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(260);

    const violations: string[] = [];
    for (const spec of extractImports(content)) {
      const target = resolveRelativeImport(appPath, spec);
      if (!target) continue;
      if (target.startsWith("src/engine/")) {
        violations.push(
          `src/App.tsx imports ${target} — mode engines belong inside owned src/modes/<slug>/ folders.`,
        );
      }
      if (getModeSlug(target)) {
        violations.push(
          `src/App.tsx imports ${target} — discover modes via src/modes/index.ts instead of importing mode folders directly.`,
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it("requires every folder under src/modes/ to expose a mode.ts or mode.tsx entrypoint", () => {
    const modesDir = path.join(SRC_DIR, "modes");
    const missing: string[] = [];

    for (const entry of fs.readdirSync(modesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(modesDir, entry.name);
      const hasEntry =
        fs.existsSync(path.join(dir, "mode.tsx")) || fs.existsSync(path.join(dir, "mode.ts"));
      if (!hasEntry) {
        missing.push(
          `src/modes/${entry.name}/ is missing mode.tsx (or mode.ts) required by convention discovery.`,
        );
      }
    }

    expect(missing).toEqual([]);
  });

  it("restricts localStorage access to the sole storage adapter", () => {
    const owner = "src/platform/storage.ts";
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const r = rel(file);
      if (r === owner) continue;
      const content = stripComments(fs.readFileSync(file, "utf8"));
      if (/\blocalStorage\b/.test(content)) {
        violations.push(
          `${r} accesses localStorage directly — use useProgress() from src/state/useProgress.ts (backed by ${owner}).`,
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it("restricts storage adapter imports to the single-writer progress hook", () => {
    const owner = "src/state/useProgress.ts";
    const storageModule = "src/platform/storage.ts";
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const r = rel(file);
      if (r === owner || r === storageModule) continue;
      const content = fs.readFileSync(file, "utf8");
      for (const spec of extractImports(content)) {
        const target = resolveRelativeImport(file, spec);
        if (target === "src/platform/storage" || target === "src/platform/storage.ts") {
          violations.push(
            `${r} imports ${storageModule} directly — use named commands on useProgress() from ${owner}.`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("restricts AudioContext and HTML Audio creation to the sole sound owner", () => {
    const owner = "src/platform/sound.ts";
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const r = rel(file);
      if (r === owner) continue;
      const content = stripComments(fs.readFileSync(file, "utf8"));
      if (/\b(AudioContext|webkitAudioContext)\b|\bnew\s+Audio\s*\(/.test(content)) {
        violations.push(
          `${r} constructs audio primitives directly — use soundEngine from ${owner}.`,
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it("restricts canvas-confetti imports to the sole confetti owner", () => {
    const owner = "src/platform/confetti.ts";
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const r = rel(file);
      if (r === owner) continue;
      const content = fs.readFileSync(file, "utf8");
      if (extractImports(content).includes("canvas-confetti")) {
        violations.push(`${r} imports canvas-confetti directly — use helpers from ${owner}.`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("forbids silent lint or type suppressions in application source", () => {
    const violations: string[] = [];
    const suppressionPattern =
      /\/\/\s*(?:@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|oxlint-disable)|\/\*\s*(?:eslint-disable|oxlint-disable)/;

    for (const file of sourceFiles) {
      const r = rel(file);
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, idx) => {
        if (suppressionPattern.test(line)) {
          violations.push(
            `${r}:${idx + 1} contains a silent suppression — fix the violation or encode an explicit architecture rule.`,
          );
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
