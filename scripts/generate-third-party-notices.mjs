#!/usr/bin/env node
// CLI entry for THIRD-PARTY-NOTICES. Two modes, one generation path:
//
//   pnpm notices        regenerate the file from the installed tree
//   pnpm notices:check  regenerate in memory and compare, writing nothing
//
// The check runs in CI's `license` job so the committed file cannot silently
// drift from the dependency tree (ADR-0002 §F). It compares only the part of
// the file that is a pure function of that tree — read the "Two hosts, one
// file" note in lib/third-party-notices.mjs for why the tail is exempt and
// what that costs.

import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import console from "node:console";

import {
  buildNotices,
  DRIFT_CHECK_BOUNDARY,
  outputPath,
  portablePrefix,
} from "./lib/third-party-notices.mjs";

const checkOnly = process.argv.includes("--check");
const { text: generated, counts, provenance } = buildNotices();

function reportDrift(committed, expected) {
  const a = committed.split("\n");
  const b = expected.split("\n");
  const differing = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) differing.push(i + 1);
  }
  console.error(
    `THIRD-PARTY-NOTICES is out of date: ${differing.length} line(s) differ ` +
      `from the current dependency tree (${counts}).`,
  );
  for (const line of differing.slice(0, 10)) {
    console.error(`  line ${line}:`);
    console.error(`    committed: ${a[line - 1] ?? "(end of file)"}`);
    console.error(`    expected:  ${b[line - 1] ?? "(end of file)"}`);
  }
  if (differing.length > 10) console.error(`  … and ${differing.length - 10} more`);
  console.error(`Run  pnpm notices  and commit the result.`);
}

function check() {
  let committed;
  try {
    committed = readFileSync(outputPath, "utf8");
  } catch (error) {
    console.error(`Cannot read ${outputPath}: ${error.message}. Run  pnpm notices  to create it.`);
    process.exit(1);
  }
  const committedPrefix = portablePrefix(committed);
  const expectedPrefix = portablePrefix(generated);
  // Fail closed: a file without the boundary predates this check or was
  // hand-edited. Comparing nothing must never read as clean.
  if (committedPrefix === undefined || expectedPrefix === undefined) {
    const missingFrom =
      committedPrefix === undefined ? "THIRD-PARTY-NOTICES" : "the generated output";
    console.error(
      `Expected marker "${DRIFT_CHECK_BOUNDARY}" is missing from ${missingFrom}. ` +
        `Run  pnpm notices  and commit the result.`,
    );
    process.exit(1);
  }
  if (committedPrefix !== expectedPrefix) {
    reportDrift(committedPrefix, expectedPrefix);
    process.exit(1);
  }
  console.error(`THIRD-PARTY-NOTICES is in sync with the dependency tree (${counts}).`);
  console.error(`Checked ${provenance}; the platform-specific tail is not compared.`);
}

if (checkOnly) {
  check();
} else {
  writeFileSync(outputPath, generated);
  console.error(`Wrote ${outputPath} (${counts}).`);
  console.error(`Generated ${provenance}.`);
}
