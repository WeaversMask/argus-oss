#!/usr/bin/env node
// README ↔ field-results propagation gate (DOC-07).
//
// `pnpm field-scan:check` guards the SNAPSHOT. It does not guard the README,
// and the difference is the whole reason this file exists. The prescribed
// workflow — rule changes, `field-scan:check` fails, `field-scan` regenerates
// — leaves every gate green with the README still quoting the old numbers,
// because regenerating the baseline is exactly what makes the check pass
// again. The first draft of this task claimed the README was "derived from
// field-results.json, so the two cannot disagree"; nothing implemented that,
// and the independent review caught the claim rather than the code.
//
// So the task splits in two. MEASURING needs the network and stays manual, by
// maintainer ruling (see field-scan.mjs). PROPAGATING needs neither network
// nor third-party code — it is arithmetic over a committed JSON file and a
// grep over a committed Markdown file — so it runs in CI on every PR, as a
// step in the `lint` job. That moves the README's figures from STATED tier to
// GATED: not "true when written", but "a build fails the day they stop being
// true", which is what this repo's documentation standard asks for.
//
// What it CANNOT do, stated so nobody mistakes its scope: it cannot tell you
// the snapshot is stale, because it never re-measures. `field-scan:check` is
// still the only thing that catches Argus's behaviour moving. This gate
// catches the second half — a snapshot that moved while the prose did not.
//
//   pnpm field-results:check    verify only; changes nothing

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";

import { readSnapshot } from "./lib/field-snapshot.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = resolve(REPO_ROOT, "docs/field-results.json");
const README = resolve(REPO_ROOT, "README.md");

/**
 * Rule-id prefixes counted as convention rather than structure.
 *
 * The split the README publishes rests on this line, so it lives in code
 * where it can be checked rather than in prose where it cannot. `style/` and
 * `docs/` encode a house style — naming, JSDoc, wildcard imports, import
 * order — and reasonable projects disagree with them. `quality/` and
 * `testing/` measure structure that survives any house style.
 */
const CONVENTION_PREFIXES = ["style/", "docs/"];

/** Split one target's byRule counts into convention and structural totals. */
function split(target) {
  let convention = 0;
  let structural = 0;
  for (const [ruleId, count] of Object.entries(target.byRule)) {
    if (CONVENTION_PREFIXES.some((prefix) => ruleId.startsWith(prefix))) convention += count;
    else structural += count;
  }
  return { convention, structural };
}

/** Render an integer the way the README's prose does (thousands separated). */
function human(value) {
  return value.toLocaleString("en-US");
}

/**
 * Every figure the README states that is derived from the snapshot.
 *
 * Each entry is `[what it is, the exact string the README must contain]`. A
 * figure absent from this list is one the gate does not protect, so add to it
 * whenever the prose gains a number.
 */
function expectedFigures(snapshot) {
  const targets = Object.fromEntries(snapshot.targets.map((target) => [target.name, target]));
  const { zod, ky, zustand } = targets;
  const zodSplit = split(zod);
  const kySplit = split(ky);
  const zustandSplit = split(zustand);
  const totalFiles = snapshot.targets.reduce((sum, target) => sum + target.filesScanned, 0);
  const pct = (part, whole) => Math.round((100 * part) / whole);

  const figures = [
    ["total files scanned", human(totalFiles)],
    ["measurement date", snapshot.measuredAt],
    ["argus commit", snapshot.argusCommit.slice(0, 7)],
    ["zod convention total", human(zodSplit.convention)],
    ["zod convention share", `${pct(zodSplit.convention, zod.violations)}%`],
    ["zod structural total", human(zodSplit.structural)],
    ["ky structural share", `${pct(kySplit.structural, ky.violations)}%`],
    ["zustand convention share", `${pct(zustandSplit.convention, zustand.violations)}%`],
  ];

  for (const target of snapshot.targets) {
    figures.push(
      [`${target.name} files`, human(target.filesScanned)],
      [`${target.name} violations`, human(target.violations)],
      [`${target.name} sha`, target.sha.slice(0, 7)],
      [`${target.name} duration`, `${target.durationSeconds}s`],
    );
  }

  // The per-rule counts the prose names individually, for zod only — it is the
  // only target whose breakdown the README spells out.
  for (const [ruleId, count] of Object.entries(zod.byRule)) {
    figures.push([`zod ${ruleId}`, human(count)]);
  }

  return figures;
}

function main() {
  // Shared reader, so a malformed snapshot gets the same "do not regenerate"
  // advice here as it does from field-scan:check.
  const snapshot = readSnapshot(SNAPSHOT);
  const readme = readFileSync(README, "utf8");

  const missing = expectedFigures(snapshot).filter(([, literal]) => !readme.includes(literal));

  if (missing.length > 0) {
    console.error("field-results:check: the README no longer matches docs/field-results.json.\n");
    for (const [what, literal] of missing) {
      console.error(`  ${what}: README does not contain "${literal}"`);
    }
    console.error("\nThe snapshot moved and the prose did not. Update README.md §Field results.");
    process.exit(1);
  }

  console.log(
    `field-results:check: README matches the snapshot (${expectedFigures(snapshot).length} figures verified).`,
  );
}

try {
  main();
} catch (error) {
  console.error(`field-results:check: ${error.message}`);
  process.exit(1);
}
