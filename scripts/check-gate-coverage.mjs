#!/usr/bin/env node
// Gate-coverage guard (OPS-07) — the root sign-off gates must reach every
// workspace package.
//
// The failure this exists to prevent is a gate that passes while checking
// nothing. `pnpm build` did exactly that for the entire life of the project:
// `turbo run build` fans out to whichever packages declare a `build` script,
// no package ever declared one, and turbo reports "0 successful, 0 total" as
// a SUCCESS. It was named as a mandatory sign-off gate in CLAUDE.md and
// asserted green in nearly every handover. P0-05's handover even recorded the
// empty-run warning and predicted it would "disappear naturally once real
// packages ship" — the packages shipped, D-5 ruled the workspace stays
// source-only, and nobody re-checked. Two hundred commits of a green gate
// that verified nothing.
//
// A vacuous gate is worse than a missing one: it is cited as evidence. So the
// build gate is gone (OPS-07), and this guard keeps the surviving gates from
// rotting the same way. Three assertions, all fail-closed:
//
//   1. Every workspace package declares `typecheck`. This is the real compile
//      verification now — `turbo run typecheck` runs `tsc --noEmit` per
//      package, and a package that declares no such script is silently skipped
//      while the root gate still exits 0.
//   2. No workspace package declares `build`. The workspace is buildless by
//      ruling (IMPLEMENTATION.md D-5: `exports` point at `src/`, and the #13
//      turbo cycle-break is benign only because of that). The day that stops
//      being true the root gates must run a build again — this turns that from
//      a silent omission into a failing check that says so.
//   3. Every workspace package is listed in the root `vitest.config.ts`
//      `projects` array. That list is hand-maintained, and its own comment
//      asks you to remember; a package missing from it is never tested and
//      `pnpm test` still goes green.
//
// Packages are enumerated by asking pnpm, never by globbing. `packages/*` is
// the obvious pattern and it is WRONG here: `packages/adapters/prettier` is
// nested one level deeper, so a single-segment glob silently omits the repo's
// only adapter — the same blind spot DOC-05's review found in the docs-delta
// gate's `SOURCE_RE`. pnpm's own answer cannot disagree with the workspace
// definition that turbo and vitest also resolve against.
//
//   pnpm gates:check    verify only; changes nothing

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VITEST_CONFIG = resolve(REPO_ROOT, "vitest.config.ts");

/** Scripts every workspace package must declare, and the root gate each backs. */
const REQUIRED_SCRIPTS = [["typecheck", "pnpm typecheck"]];

/**
 * Scripts no workspace package may declare, with the reason. A package gaining
 * one of these means a root gate stopped covering it — see the header.
 */
const FORBIDDEN_SCRIPTS = [
  [
    "build",
    "the workspace is buildless by ruling (IMPLEMENTATION.md D-5) and the root " +
      "gates run no build. If this package genuinely needs one, restore `pnpm build` " +
      "to the gate list in CLAUDE.md, re-add the CI `build` job, and re-date D-5.",
  ],
];

/**
 * Every workspace package except the root, as `{ name, dir, scripts }` where
 * `dir` is repo-relative. Asks pnpm rather than globbing the workspace file.
 */
function workspacePackages() {
  const raw = execFileSync("pnpm", ["list", "--recursive", "--depth", "-1", "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return JSON.parse(raw)
    .filter((entry) => resolve(entry.path) !== REPO_ROOT)
    .map((entry) => ({
      name: entry.name,
      dir: relative(REPO_ROOT, resolve(entry.path)).split("\\").join("/"),
      scripts: readScripts(resolve(entry.path, "package.json")),
    }));
}

/** The `scripts` map of one package manifest, or `{}` when it declares none. */
function readScripts(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, "utf8")).scripts ?? {};
}

/**
 * The quoted entries of the root vitest config's `projects` array. Read as
 * text rather than imported: importing it executes the config and pulls in
 * vitest, which this check must not need.
 */
function vitestProjects() {
  const source = readFileSync(VITEST_CONFIG, "utf8");
  const block = /projects\s*:\s*\[([^\]]*)\]/s.exec(source);
  if (!block) return null;
  return [...block[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
}

/** Every gate-coverage violation across `packages`, as human-readable lines. */
function findProblems(packages, projects) {
  const problems = [];
  for (const pkg of packages) {
    for (const [script, gate] of REQUIRED_SCRIPTS) {
      if (!pkg.scripts[script]) {
        problems.push(
          `${pkg.name} (${pkg.dir}) declares no \`${script}\` script — ${gate} skips it silently.`,
        );
      }
    }
    for (const [script, reason] of FORBIDDEN_SCRIPTS) {
      if (pkg.scripts[script]) {
        problems.push(`${pkg.name} (${pkg.dir}) declares a \`${script}\` script — ${reason}`);
      }
    }
    if (projects && !projects.some((entry) => entry.startsWith(`${pkg.dir}/`))) {
      problems.push(
        `${pkg.name} (${pkg.dir}) is absent from \`projects\` in vitest.config.ts — \`pnpm test\` never runs its tests.`,
      );
    }
  }
  return problems;
}

/** Runs the guard; exits non-zero with an explanation on any failure. */
function main() {
  const packages = workspacePackages();
  if (packages.length === 0) {
    console.error("gates:check: pnpm reported no workspace packages — refusing to pass vacuously.");
    process.exit(1);
  }

  const projects = vitestProjects();
  if (projects === null) {
    console.error(
      "gates:check: could not read `projects` from vitest.config.ts — refusing to pass vacuously.",
    );
    process.exit(1);
  }

  const problems = findProblems(packages, projects);
  if (problems.length > 0) {
    console.error("gates:check: the root gates do not cover every workspace package.\n");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("\nWhy this check exists: docs/plan/protocols/quality-gates.md §Per-PR Gates.");
    process.exit(1);
  }

  console.log(`gates:check: ${packages.length} workspace packages, all covered by the root gates.`);
}

main();
