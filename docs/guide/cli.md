# The `argus` command line

> Shipped in P2-02, colour output added in P2-03. Covers the three MVP commands, the exit-code contract, and how colour is decided. JSON output (P2-04), diff-only scanning (P2-05), and `argus fix` (P2-06) arrive later in Phase 2 and will be documented here as they land.

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
   1:1  warning  File has 402 lines, exceeding the maximum of 300.  quality/max-file-length
  84:3  warning  Function has a complexity of 14, exceeding the maximum of 10.  quality/cyclomatic-complexity

src/index.ts
  12:1  warning  Exported function should have a JSDoc comment.  docs/require-jsdoc

3 problems (3 warnings) across 27 files
```

Findings are grouped by file, ordered by position within each file, and followed by a summary counting each severity that actually occurred. Each line reads `line:col`, severity, message, then the rule id — the message gets the space, and the coordinates and rule id are dimmed as the metadata they are.

**Paths are relative to your project root** — the nearest directory at or above the scan path containing an `argus.yaml` (or your current directory if there is none). Findings are reported that way, and `ignore:` globs are matched that way, so a root config's `ignore: ["packages/*/generated/**"]` keeps excluding the same files whether you run `argus check .` from the repo root or from inside `packages/foo`.

**Which files are scanned.** Every file under the path whose extension maps to an active language: `.ts`/`.mts`/`.cts` (TypeScript), `.js`/`.mjs`/`.cjs` (JavaScript), `.py` (Python). `.tsx`/`.jsx` are **not** scanned — Argus wires the TypeScript and JavaScript grammars, not the JSX dialects. `node_modules`, `.git`, `dist`, `build`, `coverage`, `.turbo`, and `.stryker-tmp` are always skipped, as is anything matching an `ignore:` glob in your config. Symlinks are not followed.

> Python parses, but the ten built-in rules are TS/JS-tuned, so `.py` files currently produce no findings.

**Which rules run.** With no config file, **every built-in rule runs at its default severity** — a fresh `argus check .` finds things immediately. Add an `argus.yaml` to change severities, pass options, or switch rules off; see [configuration.md](./configuration.md) and the [rule reference](./rules.md). A rule id in your config that Argus does not recognise is an error, not a silent no-op — it usually means a typo.

### Colour

Severity is colour-coded — cyan `info`, yellow `warning`, red `error`, bold red `critical` — using only the base terminal palette, so the output stays readable whether your terminal is light or dark. **Colour is decoration, never information:** the severity is always spelled out in words, so nothing is lost when colour is off.

Argus colours its output when stdout is a terminal, and turns colour off when you redirect or pipe it. Override that in whichever way fits:

| Signal                | Effect                                                                |
| --------------------- | --------------------------------------------------------------------- |
| `--no-color`          | Off, whatever else says. Highest precedence                           |
| `FORCE_COLOR=1`       | On, even in a pipe (`argus check . \| less -R`) or under `NO_COLOR`   |
| `FORCE_COLOR=0`       | Off, even at a terminal                                               |
| `NO_COLOR=1`          | Off ([no-color.org](https://no-color.org); any non-empty value works) |
| `TERM=dumb`           | Off — the terminal cannot render escapes                              |
| _(none of the above)_ | On for a terminal, off when redirected                                |

They are listed in precedence order: the first one that applies decides. `FORCE_COLOR` deliberately outranks `NO_COLOR` so a one-off `FORCE_COLOR=1 argus check .` still works when your shell profile sets `NO_COLOR` globally; setting it to `0` forces the opposite, matching how the rest of the ecosystem reads that variable. An empty value counts as unset for both variables.

`--no-color` belongs to `check`, so it goes after the command name — `argus check . --no-color`, not `argus --no-color check .` (that is an unknown-option error, exit `2`).

Errors on stderr are never coloured — stdout and stderr can be redirected independently, so a colour decision made for one would be wrong for the other.

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

`check` additionally takes `--no-color` (see [Colour](#colour) above).
