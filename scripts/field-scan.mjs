#!/usr/bin/env node
// Field scan (DOC-07) — measure Argus against real third-party TypeScript.
//
// Dogfooding proves Argus holds its own bar. It cannot prove the parser
// survives code nobody here wrote, because this repo's code was written to
// pass. P2-05's review already recorded the general form of that lesson: a
// parser fed by a tool you do not control has to be probed against that tool,
// not against your repo. This script is the same idea pointed at source.
//
// MANUAL BY MAINTAINER RULING (2026-08-10). There is no CI job and no cron.
// Wiring this into the gate path would make the build fetch three third-party
// repositories on a trigger nobody schedules, which sits badly beside ADR-0003
// — install scripts blocked, a 3-day minimum release age — where the whole
// posture is to NOT consume third-party code on autopilot. The cost is honest
// and stated in the README: these numbers are a dated measurement, not a
// continuously verified one. In the badge comment's taxonomy they are STATED
// tier, alongside License and tree-sitter: true, ungated, safe because they
// change only by deliberate act. The deliberate act here is editing a rule.
//
// WHAT THE PIN IS FOR. Each target is pinned to a full commit SHA, which
// freezes THEIR side permanently — zod at ead9fcb is the same bytes forever,
// and a SHA is content-addressed, so the fetch either returns exactly those
// bytes or fails. What can still move is Argus. Re-running after a rule change
// is therefore a regression check on our own published claims, not a check on
// zod. Without the pin a changed number would tell you nothing, because the
// target moved too.
//
//   pnpm field-scan           re-measure and rewrite the snapshot
//   pnpm field-scan:check     re-measure and diff; non-zero on any difference
//
// CLONES NEVER TOUCH THE WORKING TREE. Targets are fetched into os.tmpdir()
// and removed in a `finally`. Deliberately not a repo-local directory with a
// .gitignore entry: .gitignore is a filter that `git add -f` or a mistyped
// path defeats, whereas "not in the tree" has no failure mode. That is a
// policy requirement, not tidiness — the README's Posture section commits to
// shipping no vendored third-party source, and zod's repo carries a docs site
// and benchmarks alongside its MIT library code.
//
// `git clone --depth 1` CANNOT DO THIS. It shallow-clones the default branch
// tip, whatever that is today, silently ignoring the SHA you meant. The pin
// needs init + fetch of the specific commit, which GitHub serves.
//
// FAIL CLOSED, TWICE. A failed clone and a scan reporting zero files both
// yield "nothing found", and a comparison of zero against zero passes. That
// exact shape has burned this repo twice — gitleaks exiting 0 when its own
// `git log` failed (#14), and `gh run view --log` returning an empty file with
// exit 0 during the OPS-05 sweep. Both are asserted against here.
//
// DURATION IS RECORDED BUT NEVER COMPARED. It is wall clock on whatever
// machine ran it; comparing it would fail for reasons that have nothing to do
// with Argus, and a check that cries wolf is a check people learn to ignore.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import process from "node:process";
import console from "node:console";

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
    maxBuffer: 256 * 1024 * 1024,
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
  try {
    stdout = run(process.execPath, [CLI, "check", dir, "--format", "json"]);
  } catch (error) {
    if (error.status !== 1) {
      throw new Error(`argus exited ${error.status}: ${error.stderr || error.message}`, {
        cause: error,
      });
    }
    stdout = error.stdout;
  }
  return JSON.parse(stdout);
}

/** Count violations per rule id, so the README's split is derived, not typed. */
function countByRule(violations) {
  const counts = {};
  for (const violation of violations) {
    counts[violation.ruleId] = (counts[violation.ruleId] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

/** Clone, scan, and tear down one target. */
function measure(target) {
  const dir = mkdtempSync(join(tmpdir(), `argus-field-${target.name}-`));
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
    argusCommit: run("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT }).trim(),
    targets,
  };
}

/**
 * The per-target fields `--check` compares, listed rather than subtracted.
 *
 * `durationSeconds` is deliberately absent, as are the top-level `measuredAt`
 * and `argusCommit`: all three move for reasons unrelated to Argus's
 * behaviour, and a check that fires on a slower machine is a check people
 * learn to ignore. An allowlist also means a field added to the snapshot later
 * is opted IN by hand, rather than silently joining the comparison.
 */
const COMPARED_FIELDS = ["name", "url", "sha", "filesScanned", "violations", "failures", "byRule"];

/** Compare a fresh measurement against the committed one; null when identical. */
function differences(fresh, committed) {
  const strip = (snapshot) =>
    JSON.stringify(
      (snapshot.targets ?? []).map((target) =>
        Object.fromEntries(COMPARED_FIELDS.map((field) => [field, target[field]])),
      ),
      null,
      2,
    );
  const a = strip(fresh);
  const b = strip(committed);
  return a === b ? null : { fresh: a, committed: b };
}

/** Read the committed snapshot, or fail with the command that would create it. */
function readSnapshot() {
  try {
    return JSON.parse(readFileSync(SNAPSHOT, "utf8"));
  } catch {
    throw new Error(`no snapshot at ${SNAPSHOT} — run \`pnpm field-scan\` to create it`);
  }
}

function main() {
  const checkOnly = process.argv.includes("--check");
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
    return;
  }

  const diff = differences(fresh, readSnapshot());
  if (diff) {
    console.error(
      "\nField results have changed. Argus's behaviour moved; the README is now stale.\n",
    );
    console.error(`committed:\n${diff.committed}\n`);
    console.error(`measured now:\n${diff.fresh}\n`);
    console.error("Re-run `pnpm field-scan` and update the README table to match.");
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
