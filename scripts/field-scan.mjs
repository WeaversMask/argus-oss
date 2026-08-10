#!/usr/bin/env node
// Field scan (DOC-07) — measure Argus against real third-party TypeScript.
//
// Dogfooding proves Argus holds its own bar, but cannot prove the parser
// survives code nobody here wrote — this repo's code was written to pass.
// P2-05's review recorded the general form: a parser fed by a tool you do not
// control has to be probed against that tool. Same idea, pointed at source.
//
//   pnpm field-scan           re-measure and rewrite the snapshot
//   pnpm field-scan:check     re-measure and diff (see lib/field-snapshot.mjs)
//   pnpm field-results:check  verify the README still matches the snapshot
//
// MANUAL BY MAINTAINER RULING (2026-08-10) — no CI job, no cron. Fetching
// three third-party repositories on a trigger nobody schedules sits badly
// beside ADR-0003, where the whole posture is to NOT consume third-party code
// on autopilot. So the published NUMBERS are STATED tier: true, ungated, safe
// only because they change by deliberate act. The PROSE quoting them is not —
// `check-field-results.mjs` gates that half offline, in CI. Read its header
// before changing either; the split between them is the point.
//
// THE TRIGGER IS WIDER THAN "EDITING A RULE" — the first draft of this comment
// said otherwise and was wrong. The columns also move with packages/ast,
// including a tree-sitter bump, which arrives as a Dependabot PR exempt from
// docs-delta, and which moves the "0 parse failures" the README leans on
// hardest. Full list in README.md's badge comment.
//
// WHAT THE PIN IS FOR. A full SHA freezes THEIR side permanently — zod at
// ead9fcb is the same bytes forever, and a SHA is content-addressed, so a
// fetch returns exactly those bytes or fails. What can still move is Argus, so
// re-running is a regression check on our own claims. Without the pin a
// changed number would tell you nothing, because the target moved too.
//
// `git clone --depth 1` CANNOT DO THIS. It shallow-clones the default branch
// tip, whatever that is today, silently ignoring the SHA you meant. The pin
// needs init + fetch of the specific commit, which GitHub serves.
//
// CLONES NEVER TOUCH THE WORKING TREE — os.tmpdir(), removed in a `finally`.
// Deliberately not a repo-local dir with a .gitignore entry: an ignore rule is
// a filter that `git add -f` or a mistyped path defeats, whereas "not in the
// tree" has no failure mode. The README's Posture section promises no vendored
// third-party source, and zod's repo carries a docs site and benchmarks.
//
// FAIL CLOSED, TWICE. A failed clone and a scan reporting zero files both
// yield "nothing found", and a comparison of zero against zero passes. That
// exact shape has burned this repo twice — gitleaks exiting 0 when its own
// `git log` failed (#14), and `gh run view --log` returning an empty file with
// exit 0 during the OPS-05 sweep. Both are asserted against here.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import process from "node:process";
import console from "node:console";

import {
  assertUnconfigured,
  countByRule,
  differences,
  readSnapshot,
} from "./lib/field-snapshot.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = resolve(REPO_ROOT, "docs/field-results.json");
const CLI = resolve(REPO_ROOT, "apps/cli/bin/argus.mjs");

/**
 * The measured projects, each pinned to a full commit SHA.
 *
 * Chosen to be recognisable, genuinely TypeScript, and different in shape: a
 * large monorepo carrying a docs site and benchmarks (zod), a small focused
 * library (zustand), and a mid-size one (ky). Scanned whole, at the repo root,
 * because that is what `argus check .` gives a user with no config — narrowing
 * to each project's `src/` would report a friendlier number than anyone
 * actually gets.
 */
const TARGETS = [
  {
    name: "zod",
    url: "https://github.com/colinhacks/zod.git",
    sha: "ead9fcb310bf65a70427f92ca76545efe954037e",
  },
  {
    name: "ky",
    url: "https://github.com/sindresorhus/ky.git",
    sha: "3419113b48e034fdcf8fa6bd3be3da7b3d0d758f",
  },
  {
    name: "zustand",
    url: "https://github.com/pmndrs/zustand.git",
    sha: "beca84e600e4e250f6b244d22878e72948f331c7",
  },
];

/**
 * Run a command, returning stdout; throws with stderr attached on failure.
 *
 * `maxBuffer` is raised well above Node's 1 MB default because a JSON report
 * is one object per violation and zod's is 2.2 MB. At the default, the scan
 * dies with ENOBUFS — and it dies on the largest, most interesting target
 * only, so a smaller pin set would hide it.
 */
function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

/**
 * Fetch `target` at its pinned SHA into `dir`.
 *
 * Verifies the checkout landed on the SHA we asked for rather than trusting
 * the fetch — a clone that silently resolved to something else would produce
 * numbers attributed to the wrong commit, which no output reveals.
 */
function cloneAt(target, dir) {
  run("git", ["init", "--quiet"], { cwd: dir });
  run("git", ["remote", "add", "origin", target.url], { cwd: dir });
  run("git", ["fetch", "--depth", "1", "--quiet", "origin", target.sha], { cwd: dir });
  run("git", ["checkout", "--quiet", "FETCH_HEAD"], { cwd: dir });

  const landed = run("git", ["rev-parse", "HEAD"], { cwd: dir }).trim();
  if (landed !== target.sha) {
    throw new Error(`${target.name}: checked out ${landed}, expected ${target.sha}`);
  }
}

/**
 * Scan `dir` with this working tree's Argus, returning the parsed report.
 *
 * Exit 1 means violations were found, which is the expected case here and not
 * an error; exit 2 means Argus could not analyse something and is fatal.
 */
function scan(dir) {
  let stdout;
  let failure;
  try {
    stdout = run(process.execPath, [CLI, "check", dir, "--format", "json"]);
  } catch (error) {
    // `status` is null when the spawn itself failed (ENOENT, ENOBUFS) rather
    // than the child exiting; `argus exited null` reads as a bug in this
    // script, so say what actually happened.
    if (error.status !== 1) {
      const what = error.status === null ? "argus failed to run" : `argus exited ${error.status}`;
      throw new Error(`${what}: ${error.stderr || error.message}`, { cause: error });
    }
    stdout = error.stdout;
    failure = error;
  }

  // Exit 1 is not only "violations found". Node itself exits 1 on a module
  // resolution failure or an uncaught throw, and the CLI shim propagates that
  // verbatim — so a crash arrives here indistinguishable from a clean run with
  // findings, with the real stack trace sitting in stderr. Parsing "" then
  // dies with `Unexpected end of JSON input` and throws that trace away.
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `argus exited 1 without a JSON report — it likely crashed:\n${failure?.stderr ?? "(no stderr)"}`,
      { cause: error },
    );
  }
}

/** Clone, scan, and tear down one target. */
function measure(target) {
  const dir = mkdtempSync(join(tmpdir(), `argus-field-${target.name}-`));
  assertUnconfigured(dir);
  try {
    cloneAt(target, dir);
    const started = Date.now();
    const report = scan(dir);
    const durationSeconds = Number(((Date.now() - started) / 1000).toFixed(1));

    // The empty-scan false green. A failed fetch leaves an empty directory,
    // Argus reports 0 files and 0 violations, and --check compares zero to
    // zero and passes. Refuse the reading rather than publish it.
    if (!report.summary?.filesScanned) {
      throw new Error(`${target.name}: scan reported 0 files — refusing to record an empty scan`);
    }

    // All three counts are asserted, not just the first. A renamed contract
    // field reads as `undefined`, JSON.stringify DROPS the key entirely, and
    // the write path would publish a snapshot silently missing it.
    for (const field of ["filesScanned", "violations", "failures"]) {
      if (!Number.isInteger(report.summary[field])) {
        throw new Error(
          `${target.name}: summary.${field} is not an integer — report contract changed?`,
        );
      }
    }

    return {
      name: target.name,
      url: target.url.replace(/\.git$/, ""),
      sha: target.sha,
      filesScanned: report.summary.filesScanned,
      violations: report.summary.violations,
      failures: report.summary.failures,
      durationSeconds,
      byRule: countByRule(report.violations ?? []),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The Argus commit these numbers came from, marked `-dirty` when it isn't.
 *
 * Without the marker this records "HEAD at the time", not "the code that
 * produced these numbers" — and the prescribed workflow guarantees they
 * differ: you edit a rule, run `pnpm field-scan` while that edit is still
 * uncommitted, and the field names the parent commit, which is precisely the
 * version that did NOT produce the measurement. The README publishes this
 * value, so a provenance claim that is wrong by one commit is worse than one
 * that admits it was taken mid-edit.
 */
function argusCommit() {
  const head = run("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT }).trim();
  const dirty = run("git", ["status", "--porcelain"], { cwd: REPO_ROOT }).trim() !== "";
  return dirty ? `${head}-dirty` : head;
}

/** Re-measure every target and assemble the snapshot document. */
function buildSnapshot() {
  const targets = TARGETS.map((target) => {
    process.stderr.write(`  scanning ${target.name} @ ${target.sha.slice(0, 7)} …\n`);
    return measure(target);
  });

  return {
    $comment:
      "Generated by `pnpm field-scan`. A dated measurement, not a live one — " +
      "see scripts/field-scan.mjs for why this is manual. durationSeconds is " +
      "machine-dependent and is never compared by --check.",
    measuredAt: new Date().toISOString().slice(0, 10),
    argusCommit: argusCommit(),
    targets,
  };
}

function main() {
  // Unrecognised arguments are rejected rather than ignored. The default path
  // OVERWRITES the committed baseline, so a typo (`-check`, `--dry-run`) must
  // not silently fall through to the destructive mode.
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== "--check");
  if (unknown.length > 0) {
    throw new Error(`unrecognised argument(s): ${unknown.join(", ")} — the only flag is --check`);
  }
  const checkOnly = args.includes("--check");

  // Read the snapshot BEFORE measuring in check mode: three network clones to
  // then discover there is nothing to compare against is a slow way to fail.
  const committed = checkOnly ? readSnapshot(SNAPSHOT) : null;

  process.stderr.write(
    checkOnly
      ? "Re-measuring field results to verify the snapshot …\n"
      : "Measuring field results …\n",
  );
  const fresh = buildSnapshot();

  if (!checkOnly) {
    writeFileSync(SNAPSHOT, `${JSON.stringify(fresh, null, 2)}\n`);
    console.log(`\nWrote ${SNAPSHOT}`);
    for (const target of fresh.targets) {
      console.log(
        `  ${target.name}: ${target.filesScanned} files, ${target.violations} violations, ` +
          `${target.failures} failures, ${target.durationSeconds}s`,
      );
    }
    console.log("\nRe-run `pnpm field-results:check` — the README quotes these numbers.");
    return;
  }

  const found = differences(fresh, committed);
  if (found.length > 0) {
    console.error("\nField results have changed:\n");
    for (const line of found) console.error(`  ${line}`);
    console.error(
      "\nRe-run `pnpm field-scan`, then `pnpm field-results:check` to find every README figure that moved.",
    );
    process.exit(1);
  }
  console.log("\nField results match the committed snapshot.");
}

try {
  main();
} catch (error) {
  console.error(`field-scan: ${error.message}`);
  process.exit(1);
}
