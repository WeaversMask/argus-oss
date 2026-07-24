# `@argus/cli`

> The first runnable surface of Argus. `argus check` composes config, parser, engine, and the built-in rules into real findings; `argus init` and `argus explain` round out the MVP command set.

## Purpose

`apps/cli` is the outermost layer of the hexagon — an **application**, not a library. It owns no analysis logic of its own: it wires existing packages together, turns their `Result`s into human output, and maps outcomes onto process exit codes. Every rule, every parse, and every config decision lives in `packages/*`; this app decides only what to run, in what order, and how to report it.

It is the first `apps/*` workspace member. Nothing imports it (`packages-never-import-apps` in [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs) makes that mechanical), so it has no public `exports` map and no `*-public-entry-only` rule of its own.

## Commands

| Command                 | Does                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| `argus check [path]`    | Scans a file or directory (default `.`) and reports violations           |
| `argus init`            | Writes a starter `argus.yaml` listing every built-in rule at its default |
| `argus explain <rule>`  | Prints a rule's name, default severity, docs link, and full description  |
| `argus --version`, `-v` | Prints the CLI version (read from this package's `package.json`)         |
| `argus --help`          | Usage; also available per command (`argus check --help`)                 |

### Exit codes

The convention from the phase-02 spec, enforced by tests:

| Code | Meaning                                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------- |
| `0`  | Success — no violations (also: `--help`, `--version`, `init`, a successful `explain`, a scan matching no files)       |
| `1`  | Violations found                                                                                                      |
| `2`  | Operational error — bad usage, unknown command/rule, config error, missing path, or a file that could not be analysed |

Precedence in `check`: any file that failed to parse or analyse → `2`, else any violation → `1`, else `0`. A file that could not be analysed is never silently dropped — it is reported on stderr and counted in the summary ("no silent suppression").

## How `check` composes the pipeline

```
ConfigLoader.search()      @argus/config    → ResolvedConfig | undefined
        ↓
resolveActivations()       this app         → RuleActivation[] (+ unknown ids)
        ↓
discoverFiles()            this app         → files, filtered by language + ignore globs
        ↓
TreeSitterAstParser.parse() @argus/ast      → ParsedFile per file (one parser per process)
        ↓
Engine + Runner.runAll()   @argus/rule-engine → violations + per-file failures
        ↓
formatReport()             this app         → stdout text, then an exit code
```

**Default rule posture:** with no config, every rule in `builtinRules` runs at its own `defaultSeverity`, so a fresh `argus check .` finds things immediately. Config overrides severity and options per rule id, including `off` (kept in the activation list so what was explicitly disabled stays visible; the engine skips it). A configured id matching no built-in rule is a hard error, never a silent no-op.

**Not wired yet:** suppressions and layer classification. Config v1 exposes neither section (deferred — see `@argus/config`), so there is nothing to feed core's `matchingSuppression` / `classifyLayer` yet. `--diff` (P2-05), the colour console formatter (P2-03), and JSON output (P2-04) are separate follow-ups; `formatReport` is the plain baseline that makes the exit-code contract observable.

## How it runs: the `bin` wrapper and the loader

The Argus workspace is **buildless** — every `@argus/*` package exports raw TypeScript and imports its own internals with `.js` specifiers (TS `moduleResolution: "bundler"`). Node cannot run that as-is: it neither remaps `.js`→`.ts` nor accepts the TS parameter-property syntax the domain uses in strip-only mode.

[`bin/argus.mjs`](./bin/argus.mjs) therefore re-execs Node with:

- `--experimental-transform-types` — full type transform, not strip-only (parameter properties);
- `--import loader/register.mjs` — registers [`loader/hooks.mjs`](./loader/hooks.mjs), a ~15-line `resolve` hook that redirects a relative `.js` specifier to its `.ts` sibling when that sibling exists;
- `--disable-warning=ExperimentalWarning` — the flag above is experimental and would otherwise print on every run.

The child inherits stdio and its exit code is propagated verbatim, so the 0/1/2 contract survives the extra hop. This was the maintainer's ruling for P2-02 over adding `tsx` or a bundler: **zero new runtime dependencies**. The trade-off is an experimental Node flag and a hand-maintained hook; packaging a self-contained bundle for `npm i -g @argus/cli` is a deliberately deferred follow-up.

Tests bypass all of this — Vitest resolves TypeScript itself, so `run()` and every command are tested directly.

## How it fits

- **Depends on:** `@argus/core` (domain types, `matchGlob`), `@argus/config`, `@argus/ast`, `@argus/rule-engine`, `@argus/rules-builtin`, `commander` (arg parsing, MIT, zero runtime deps), `neverthrow`.
- **Dev-depends on:** `@argus/testing` (vitest config).
- **Consumed by:** nothing — it is the outermost layer.

## Maintenance notes

- **`run(argv, io)` is the testable seam.** Every command is a pure function of its arguments plus an injected [`CliIO`](./src/io.ts) (`stdout`/`stderr`/`cwd`); `src/cli.ts` is the only module that touches `process`, and it is branch-free. Tests pass a capturing fake — no stream interception, no subprocesses.
- **commander's process exits are intercepted** with `exitOverride()`: help and version map to `0`, every other `CommanderError` (unknown command, missing argument) to `2`. Bare `argus` prints help via an explicit `outputHelp()` rather than a default action — with a default action, commander reports an unknown command as "too many arguments".
- **One parser instance per scan process.** Grammar wasm cannot be freed (see `@argus/ast`), so the parser is constructed once and disposed in a `finally`.
- **Paths anchor to the project root, not the invocation directory.** [`findProjectRoot`](./src/project-root.ts) walks up for the nearest `argus.yaml`/`argus.yml` (falling back to cwd), and that root is the base for both displayed paths and `ignore:` glob matching. Without this, a root config's `ignore:` globs silently stopped matching when the user ran `argus` from a subdirectory — an independent-review finding on the P2-02 PR, now covered by regression tests. The walk mirrors `ConfigLoader.search` using the same public `CONFIG_FILE_NAMES`, because the loader returns a merged config without reporting which file it came from.
- **Directories always pruned** during discovery, whatever config says: `node_modules`, `.git`, `dist`, `build`, `coverage`, `.turbo`, `.stryker-tmp`. Symlinks are skipped entirely (no cycles). `.tsx`/`.jsx` are deliberately **not** scanned — the AST adapter wires the TS/JS grammars, not the JSX dialects, so they would misparse.
- **Coverage exception:** `src/cli.ts` is excluded (see [`vitest.config.ts`](./vitest.config.ts)) — it is the process entry, exercised end-to-end through the bin, with no logic of its own. The remaining uncovered branches are defensive guards on paths that need a hostile filesystem or a corrupted rule catalogue: the duplicate-registration check on `builtinRules`, the per-file read/`filePath`-validation failures, and the `EEXIST` race in `init`.
