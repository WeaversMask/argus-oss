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
// CLAIM is gone (OPS-07) — `pnpm build` is no longer a sign-off gate anywhere.
// The command and its CI job stay, because D-8's bundle makes them real soon
// and deleting them would mean re-adding "Build" to the branch-protection
// required set within weeks. This guard is what keeps the gates that ARE
// claimed from rotting the same way. Three assertions, all fail-closed:
//
//   1. Every workspace package declares `typecheck`, and it really runs
//      `tsc --noEmit`. This is the real compile verification now, and a package
//      that declares no such script is silently skipped while the root gate
//      still exits 0. The content is asserted too, because a stub (`"typecheck":
//      "true"`) satisfies presence and checks nothing — the exact dodge P0-05's
//      handover warned the next agent away from.
//   2. No workspace package declares `build` — a tripwire, not a prohibition.
//      The workspace is buildless by ruling (IMPLEMENTATION.md D-5: `exports`
//      point at `src/`, and the #13 turbo cycle-break is benign only because of
//      that), which is the whole reason `pnpm build` is not a sign-off gate.
//      The day that stops being true the gate list must say so again — this
//      turns that from a silent omission into a failing check that says so.
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
 * Scripts every workspace package must declare, as `[script, exactCommand, gate]`.
 *
 * The command is compared for EQUALITY, not containment. Presence alone is not
 * coverage — `"typecheck": "true"` satisfies a presence check and compiles
 * nothing, the stub dodge P0-05's handover warned the next agent away from — but
 * containment is barely better: `tsc --noEmit || true` contains the command and
 * makes `pnpm typecheck` PRINT a type error and still exit 0. That was found by
 * the second review, reproduced against the real gate, and it is not adversarial:
 * `|| true` is how anyone silences a noisy package mid-refactor.
 *
 * All ten packages are exactly `tsc --noEmit` today, so equality costs nothing.
 * If a package ever needs flags, widen this deliberately — and reject `||`, `;`
 * and `&&` when you do, or the loophole comes straight back.
 */
const REQUIRED_SCRIPTS = [["typecheck", "tsc --noEmit", "pnpm typecheck"]];

/**
 * Scripts whose appearance means a documented assumption just stopped holding.
 * Not a prohibition — a tripwire. Declaring one is a legitimate thing to do
 * (D-8's bundle will), and the point is that it must not happen silently.
 */
const TRIPWIRE_SCRIPTS = [
  [
    "build",
    "the workspace has been buildless since P0 (IMPLEMENTATION.md D-5), which is why " +
      "`pnpm build` is NOT in the root sign-off gate list — it ran zero tasks. Declaring " +
      "one makes it real again: put `pnpm build` back in the gate list in CLAUDE.md and " +
      "agentic-execution.md, and re-date D-5. The CI `build` job already runs it.",
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
 * The entries of the root vitest config's `projects` array, as
 * `{ entries }` or `{ error }`. Read as text rather than imported: importing it
 * executes the config and pulls in vitest, which this check must not need.
 *
 * **This function refuses to guess, and that is its entire design.** Two reviews
 * found the same bug here, twice over: scraping quoted strings out of the block
 * credits any path that merely LOOKS like an entry. First a commented-out line
 * (`// "packages/core/…"` — how anyone disables a flaky suite) read as live;
 * stripping comments fixed that one instance and not the class, because a
 * conditional spread — `...(process.env.RUN_CORE ? [x] : [])`, an ordinary
 * vitest pattern — still scraped as live. Reproduced end to end: nine real
 * projects, `@argus/core` absent, guard exits 0 reporting all ten covered.
 *
 * So the block must be a plain list of string literals and nothing else. Any
 * spread, ternary, variable, inline object or nested array — anything this
 * function cannot evaluate statically — is an ERROR, not something to squint at.
 * A guard whose whole promise is "never passes vacuously" may not silently
 * downgrade to a text search when the input outgrows it.
 */
function vitestProjects() {
  const source = readFileSync(VITEST_CONFIG, "utf8");
  const block = /projects\s*:\s*\[([^\]]*)\]/s.exec(source);
  if (!block) return { error: "could not find a `projects: [ … ]` array" };

  const live = block[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const residue = live.replace(/(["'])[^"']*\1/g, "").replace(/[\s,]/g, "");
  if (residue !== "") {
    return {
      error:
        "`projects` holds something other than plain string literals " +
        `(leftover: ${JSON.stringify(residue.slice(0, 40))}), which cannot be ` +
        "verified statically — a spread, conditional, variable or inline object",
    };
  }
  return { entries: [...live.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]) };
}

/**
 * Whether one `projects` entry covers `dir` — either a config-file path inside
 * it (`packages/core/vitest.config.ts`) or a single-level DIRECTORY glob
 * matching it (`packages/*`).
 *
 * A glob matches `dir` exactly rather than any prefix, because vitest's own
 * `packages/*` does not reach `packages/adapters/prettier` either — over-
 * matching would credit the nested adapter to a glob that never runs it.
 *
 * Deliberately narrow, and it fails CLOSED on everything it does not model:
 * a double star (treated as two single-level stars, so it matches less than
 * vitest would), a glob over config FILES rather than directories (a star
 * followed by a slash and a filename), and a bare directory entry with no
 * trailing slash all report the package absent rather than covered. That is a
 * false alarm, not a false pass — fix the entry or widen this function, but do
 * not loosen it into a prefix match. Known limitation: a package directory
 * containing another workspace package (none today) is credited by its child.
 */
function covers(entry, dir) {
  if (entry.includes("*")) {
    const pattern = entry.replace(/[.+^${}()|[\]\\?]/g, "\\$&").replace(/\*/g, "[^/]*");
    return new RegExp(`^${pattern}$`).test(dir);
  }
  return entry.startsWith(`${dir}/`);
}

/** Missing-or-weakened required scripts, and tripwire ones, for one package. */
function scriptProblems(pkg) {
  const problems = [];
  for (const [script, exactCommand, gate] of REQUIRED_SCRIPTS) {
    const declared = pkg.scripts[script];
    if (declared === undefined) {
      problems.push(`declares no \`${script}\` script — ${gate} skips it silently.`);
    } else if (declared.trim() !== exactCommand) {
      problems.push(
        `declares \`${script}\` as "${declared}", not exactly \`${exactCommand}\` — ${gate} cannot be trusted to check it (\`${exactCommand} || true\` prints errors and still exits 0). Widen REQUIRED_SCRIPTS deliberately if this is intended.`,
      );
    }
  }
  for (const [script, reason] of TRIPWIRE_SCRIPTS) {
    if (script in pkg.scripts) problems.push(`declares a \`${script}\` script — ${reason}`);
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
  if (projects.error) {
    console.error(`gates:check: ${projects.error}.`);
    console.error("  in vitest.config.ts — refusing to pass vacuously.");
    process.exit(1);
  }

  const problems = findProblems(packages, projects.entries);
  if (problems.length > 0) {
    console.error("gates:check: the root gates do not cover every workspace package.\n");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("\nWhy this check exists: docs/plan/protocols/quality-gates.md §Per-PR Gates.");
    process.exit(1);
  }

  console.log(`gates:check: ${packages.length} workspace packages, all covered by the root gates.`);
}

main();
