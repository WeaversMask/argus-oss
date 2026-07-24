# The `argus` command line

> Shipped in P2-02. Covers the three MVP commands and the exit-code contract. Colour output (P2-03), JSON output (P2-04), diff-only scanning (P2-05), and `argus fix` (P2-06) arrive later in Phase 2 and will be documented here as they land.

## Running it

Argus is not published to npm yet, so today you run it from a clone of the repo:

```bash
node apps/cli/bin/argus.mjs check .
```

`pnpm install` at the repo root is the only prerequisite (Node ≥ 22.22.1). Inside the workspace you can also use `pnpm --filter @argus/cli start -- check .`.

## `argus check [path]`

Scans a file or a directory tree (default: the current directory) and reports every violation the active rules find.

```bash
node apps/cli/bin/argus.mjs check ./src
```

```
src/services/report.ts
  1:1    warning  quality/max-file-length      File has 402 lines, exceeding the maximum of 300.
  84:3   warning  quality/cyclomatic-complexity  Function has a complexity of 14, exceeding the maximum of 10.

src/index.ts
  12:1   warning  docs/require-jsdoc           Exported function should have a JSDoc comment.

3 problems (3 warnings) across 27 files
```

Findings are grouped by file, ordered by position within each file, and followed by a summary counting each severity that actually occurred.

**Which files are scanned.** Every file under the path whose extension maps to an active language: `.ts`/`.mts`/`.cts` (TypeScript), `.js`/`.mjs`/`.cjs` (JavaScript), `.py` (Python). `.tsx`/`.jsx` are **not** scanned — Argus wires the TypeScript and JavaScript grammars, not the JSX dialects. `node_modules`, `.git`, `dist`, `build`, `coverage`, `.turbo`, and `.stryker-tmp` are always skipped, as is anything matching an `ignore:` glob in your config. Symlinks are not followed.

> Python parses, but the ten built-in rules are TS/JS-tuned, so `.py` files currently produce no findings.

**Which rules run.** With no config file, **every built-in rule runs at its default severity** — a fresh `argus check .` finds things immediately. Add an `argus.yaml` to change severities, pass options, or switch rules off; see [configuration.md](./configuration.md) and the [rule reference](./rules.md). A rule id in your config that Argus does not recognise is an error, not a silent no-op — it usually means a typo.

## `argus init`

Writes a starter `argus.yaml` in the current directory, listing every built-in rule at its default severity so the catalogue is visible in the file itself:

```bash
node apps/cli/bin/argus.mjs init
```

If an `argus.yaml` already exists it is left untouched (and this is reported, not treated as a failure).

## `argus explain <rule-id>`

Describes one rule — what it flags, its default severity, and its documentation link:

```bash
node apps/cli/bin/argus.mjs explain quality/max-nesting-depth
```

```
quality/max-nesting-depth
  name:     max-nesting-depth
  severity: warning (default)

Disallow block nesting deeper than a configured maximum, measured per function scope.
```

An unknown id prints the full list of known rule ids.

## Exit codes

Designed for CI: a non-zero exit fails the job, and `1` versus `2` distinguishes "the code has problems" from "Argus could not do its job".

| Code | Meaning                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Success — no violations found. Also `--help`, `--version`, `init`, a successful `explain`, and a scan that matched no files |
| `1`  | Violations were found                                                                                                       |
| `2`  | Argus could not complete: bad usage, unknown command or rule id, invalid config, missing path, or a file it could not parse |

If some files could not be analysed, `check` reports each one on stderr, notes the count in the summary, and exits `2` even when the files it _could_ read were clean — an incomplete scan never reports itself as a pass.

## Global flags

| Flag              | Does                                   |
| ----------------- | -------------------------------------- |
| `-v`, `--version` | Print the Argus version                |
| `--help`          | Print usage; works on every subcommand |
