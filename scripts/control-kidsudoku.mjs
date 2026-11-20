#!/usr/bin/env node
/**
 * Headless Playwright verification CLI ("eyes") for KidSudoku.
 *
 * Usage:
 *   node scripts/control-kidsudoku.mjs [all|smoke|solve-2x2|solve-sudoku|themes|mobile] [--url http://localhost:5173/]
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_PACKAGE_DIR) {
    candidates.push(process.env.PLAYWRIGHT_PACKAGE_DIR);
  }
  candidates.push("playwright");

  const home = process.env.HOME || "";
  const miseRoot = path.join(home, ".local/share/mise/installs/npm-playwright");
  if (fs.existsSync(miseRoot)) {
    try {
      const found = execSync(
        `find "${miseRoot}" -name package.json -path '*/playwright/package.json' 2>/dev/null | head -n 1`,
        { encoding: "utf8" },
      ).trim();
      if (found) candidates.push(path.dirname(found));
    } catch {
      // ignore discovery error
    }
  }

  for (const id of candidates) {
    try {
      return require(id);
    } catch {
      // try next
    }
  }

  throw new Error("Unable to locate Playwright. Install playwright or set PLAYWRIGHT_PACKAGE_DIR.");
}

function parseArgs(argv) {
  let command = "all";
  let url = "http://localhost:5173/";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--url" && argv[i + 1]) {
      url = argv[++i];
    } else if (!arg.startsWith("--")) {
      command = arg;
    }
  }

  return { command, url };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function withPage(browser, { url, viewport, seedProgress }, fn) {
  const context = await browser.newContext({ viewport });
  if (seedProgress) {
    await context.addInitScript((data) => {
      window.localStorage.setItem("kidsudoku-make10-progress-v1", JSON.stringify(data));
    }, seedProgress);
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  page.on("requestfailed", (req) => {
    // Ignore third-party Google Fonts in offline/restricted environments
    if (!req.url().includes("fonts.googleapis.com") && !req.url().includes("fonts.gstatic.com")) {
      errors.push(`requestfailed: ${req.url()} (${req.failure()?.errorText ?? "unknown"})`);
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('nav[aria-label="Game modes"]');

  try {
    const result = await fn(page);
    assert(errors.length === 0, `Runtime errors detected:\n  ${errors.join("\n  ")}`);
    return result;
  } finally {
    await context.close();
  }
}

async function runSmoke(browser, url) {
  await withPage(browser, { url, viewport: { width: 1280, height: 840 } }, async (page) => {
    const modeLabels = ["2×2", "2 Blank", "4×4", "Daily"];
    for (const label of modeLabels) {
      const btn = page.locator('nav[aria-label="Game modes"] button', { hasText: label }).first();
      await btn.click();
      await page.waitForTimeout(120);
      const isCurrent = await btn.getAttribute("aria-current");
      assert(isCurrent === "page", `Mode "${label}" did not become active`);
    }

    // Open & close Settings modal
    await page.getByRole("button", { name: /settings/i }).click();
    await page.waitForSelector('[role="dialog"]');
    await page.getByRole("button", { name: "Done" }).click();
    await page.waitForTimeout(180);
  });
  console.log("PASS smoke: all 4 modes + Settings modal render with zero console/page errors");
}

async function runSolve2x2(browser, url) {
  await withPage(browser, { url, viewport: { width: 1280, height: 840 } }, async (page) => {
    const cells = page.locator('[role="gridcell"]');
    const count = await cells.count();
    assert(count === 4, `Expected 4 gridcells in 2×2 board, got ${count}`);

    let givenSum = 0;
    let missingCount = 0;
    for (let i = 0; i < count; i++) {
      const aria = (await cells.nth(i).getAttribute("aria-label")) ?? "";
      const match = /Quadrant \d+: (\d+)/.exec(aria);
      if (match) {
        givenSum += Number(match[1]);
      } else {
        missingCount++;
      }
    }
    assert(missingCount === 1, `Expected 1 missing quadrant in Classic 2×2, got ${missingCount}`);

    const answer = 10 - givenSum;
    assert(answer >= 0 && answer <= 10, `Computed invalid answer ${answer} from sum ${givenSum}`);

    // Tap winning key on the NumberPad
    const padKey = page.getByRole("button", { name: new RegExp(`^Choose ${answer}$`) });
    await padKey.click();

    // Verify standalone floating equation renders with "= 10"
    const status = page.locator('[role="status"]').first();
    await status.waitFor({ state: "visible", timeout: 3000 });
    const statusText = (await status.innerText()).replace(/\s+/g, " ").trim();
    assert(
      statusText.includes("= 10") || statusText.includes("=10"),
      `Expected standalone equation ending in '= 10', got "${statusText}"`,
    );

    // Verify Option A1: bottom Next button appears underneath the numbers and replaces Hint
    const nextBtn = page.getByRole("button", { name: /^Next$/i });
    await nextBtn.waitFor({ state: "visible", timeout: 3000 });
    const padBox = await padKey.boundingBox();
    const nextBox = await nextBtn.boundingBox();
    assert(
      padBox && nextBox && nextBox.y > padBox.y,
      "Expected Next button to be positioned underneath the number pad",
    );

    // Click Next and verify play controls return
    await nextBtn.click();
    await page
      .getByRole("button", { name: /^Hint$/i })
      .waitFor({ state: "visible", timeout: 3000 });
  });
  console.log("PASS solve-2x2: floating win equation + bottom Next CTA swap + advance verified");
}

async function runSolveSudoku(browser, url) {
  await withPage(browser, { url, viewport: { width: 1280, height: 840 } }, async (page) => {
    await page.locator('nav[aria-label="Game modes"] button', { hasText: "4×4" }).click();
    await page.waitForTimeout(150);

    // Solve cleanly using built-in Hint action (<= 16 empty cells)
    for (let step = 0; step < 16; step++) {
      const won = await page
        .locator('[role="status"]')
        .filter({ hasText: "Every box makes 10!" })
        .isVisible();
      if (won) break;
      const hintBtn = page.getByRole("button", { name: /^Hint$/i });
      if (!(await hintBtn.isVisible()) || (await hintBtn.isDisabled())) break;
      await hintBtn.click();
      await page.waitForTimeout(120);
    }

    const status = page.locator('[role="status"]').first();
    await status.waitFor({ state: "visible", timeout: 3000 });
    const statusText = (await status.innerText()).trim();
    assert(
      statusText.includes("Every box makes 10!"),
      `Expected 4×4 win status, got "${statusText}"`,
    );

    const newBoardBtn = page.getByRole("button", { name: /^New Board$/i });
    await newBoardBtn.waitFor({ state: "visible", timeout: 3000 });
    await newBoardBtn.click();
    await page
      .getByRole("button", { name: /^Hint$/i })
      .waitFor({ state: "visible", timeout: 3000 });
  });
  console.log("PASS solve-sudoku: 4×4 solve flow, win status, and New Board reset verified");
}

async function runThemes(browser, url) {
  const seedProgress = {
    totalSolved: 50,
    bestStreak: 12,
    setsCompleted: 10,
    sudoku4x4Solved: 2,
    soundEnabled: false,
    pipsEnabled: false,
    targetSum: 10,
    theme: "warm-paper",
    pinnedStampId: null,
    dailyCompletedDates: [],
    seenRewardCount: 12,
  };

  await withPage(
    browser,
    { url, viewport: { width: 1280, height: 840 }, seedProgress },
    async (page) => {
      await page.getByRole("button", { name: /stamp shelf/i }).click();
      await page.waitForSelector('[role="dialog"]');

      for (const [label, expectedTheme] of [
        ["Matcha Garden", "matcha-garden"],
        ["Cozy Dusk", "cozy-dusk"],
        ["Warm Paper", "warm-paper"],
      ]) {
        await page.getByRole("button", { name: new RegExp(label, "i") }).click();
        await page.waitForTimeout(100);
        const applied = await page.evaluate(() =>
          document.documentElement.getAttribute("data-theme"),
        );
        assert(
          applied === expectedTheme,
          `Expected data-theme="${expectedTheme}", got "${applied}"`,
        );
      }
    },
  );
  console.log("PASS themes: warm-paper, matcha-garden, and cozy-dusk switch cleanly");
}

async function runMobile(browser, url) {
  await withPage(browser, { url, viewport: { width: 360, height: 740 } }, async (page) => {
    for (const label of ["2×2", "2 Blank", "4×4", "Daily"]) {
      await page.locator('nav[aria-label="Game modes"] button', { hasText: label }).first().click();
      await page.waitForTimeout(120);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      assert(overflow <= 1, `Horizontal overflow of ${overflow}px on 360px mobile in "${label}"`);
    }
  });
  console.log("PASS mobile: zero horizontal overflow across all 4 modes at 360×740");
}

async function main() {
  const { command, url } = parseArgs(process.argv.slice(2));
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });

  const runners = {
    smoke: () => runSmoke(browser, url),
    "solve-2x2": () => runSolve2x2(browser, url),
    "solve-sudoku": () => runSolveSudoku(browser, url),
    themes: () => runThemes(browser, url),
    mobile: () => runMobile(browser, url),
  };

  try {
    if (command === "all") {
      for (const fn of Object.values(runners)) {
        await fn();
      }
    } else if (runners[command]) {
      await runners[command]();
    } else {
      throw new Error(
        `Unknown command "${command}". Expected one of: all, ${Object.keys(runners).join(", ")}`,
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
