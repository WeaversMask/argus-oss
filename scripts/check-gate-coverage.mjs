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
//   1. Every workspace package declares `typecheck`, and it really runs
//      `tsc --noEmit`. This is the real compile verification now, and a package
//      that declares no such script is silently skipped while the root gate
//      still exits 0. The content is asserted too, because a stub (`"typecheck":
//      "true"`) satisfies presence and checks nothing — the exact dodge P0-05's
//      handover warned the next agent away from.
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

/**
 * Scripts every workspace package must declare, as `[script, mustContain, gate]`.
 *
 * `mustContain` is checked because presence alone is not coverage: a package
 * declaring `"typecheck": "true"` satisfies a presence check and compiles
 * nothing, which is the stub-script dodge P0-05's handover explicitly warned
 * the next agent away from. All ten packages already run exactly `tsc --noEmit`,
 * so asserting the content costs nothing today and closes the loophole.
 */
const REQUIRED_SCRIPTS = [["typecheck", "tsc --noEmit", "pnpm typecheck"]];

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
  // POSIX-only, deliberately: `execFileSync` without a shell cannot launch
  // `pnpm.cmd`, so this exits with ENOENT on Windows rather than a gate result.
  // The repo targets macOS and ubuntu CI; normalizing `\` separators here would
  // be dead code claiming a portability the first line does not deliver.
  const raw = execFileSync("pnpm", ["list", "--recursive", "--depth", "-1", "--json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return JSON.parse(raw)
    .filter((entry) => resolve(entry.path) !== REPO_ROOT)
    .map((entry) => ({
      name: entry.name,
      dir: relative(REPO_ROOT, resolve(entry.path)),
      scripts: readScripts(resolve(entry.path, "package.json")),
    }));
}

/** The `scripts` map of one package manifest, or `{}` when it declares none. */
function readScripts(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, "utf8")).scripts ?? {};
}

/**
 * The live entries of the root vitest config's `projects` array. Read as text
 * rather than imported: importing it executes the config and pulls in vitest,
 * which this check must not need.
 *
 * Comments are stripped FIRST, and that is the whole point. Commenting an entry
 * out is how anyone disables a flaky suite, and a quoted path inside a comment
 * is textually identical to a live one — so matching quotes over the raw block
 * reports a package as tested while `pnpm test` skips it entirely. That is this
 * script's own failure mode reproduced inside the guard written to prevent it;
 * the independent review caught it by commenting out `@argus/core`.
 */
function vitestProjects() {
  const source = readFileSync(VITEST_CONFIG, "utf8");
  const block = /projects\s*:\s*\[([^\]]*)\]/s.exec(source);
  if (!block) return null;
  const live = block[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  return [...live.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
}

/**
 * Whether one `projects` entry covers `dir` — either a config path inside it,
 * or a directory glob matching it. Vitest accepts both, and the glob form is a
 * legitimate way to retire the hand-maintained list this check polices.
 *
 * A glob matches `dir` exactly rather than any prefix of it, because vitest's
 * own `packages/*` does not reach `packages/adapters/prettier` either — over-
 * matching here would credit the nested adapter to a glob that never runs it.
 *
 * Known limitation: a package directory containing another workspace package
 * (none today) would be credited by its child's entry.
 */
function covers(entry, dir) {
  if (entry.includes("*")) {
    const pattern = entry.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
    return new RegExp(`^${pattern}$`).test(dir);
  }
  return entry.startsWith(`${dir}/`);
}

/** Missing-or-stubbed required scripts, and forbidden ones, for one package. */
function scriptProblems(pkg) {
  const problems = [];
  for (const [script, mustContain, gate] of REQUIRED_SCRIPTS) {
    const declared = pkg.scripts[script];
    if (!declared) {
      problems.push(`declares no \`${script}\` script — ${gate} skips it silently.`);
    } else if (!declared.includes(mustContain)) {
      problems.push(
        `declares \`${script}\` as "${declared}", which never runs \`${mustContain}\` — ${gate} passes it without checking anything.`,
      );
    }
  }
  for (const [script, reason] of FORBIDDEN_SCRIPTS) {
    if (pkg.scripts[script]) problems.push(`declares a \`${script}\` script — ${reason}`);
  }
  return problems;
}

/** Every gate-coverage violation across `packages`, as human-readable lines. */
function findProblems(packages, projects) {
  const problems = [];
  for (const pkg of packages) {
    for (const problem of scriptProblems(pkg)) {
      problems.push(`${pkg.name} (${pkg.dir}) ${problem}`);
    }
    if (!projects.some((entry) => covers(entry, pkg.dir))) {
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
