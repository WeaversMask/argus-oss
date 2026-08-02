# `@argus/orchestrator`

> Scan orchestration: what a scan **covers**. Today that means diff mode — turning a git base ref into the set of changed files and lines, and narrowing a scan's violations to them (P2-05).

## Purpose

A scan has two kinds of question. "Is this code wrong?" belongs to the rules. "Should this code have been looked at at all?" belongs here.

Diff mode is the first of those questions to need a home. `argus check --diff main` scans only what a branch changed, and reports only the violations that land on changed lines — the difference between a CI comment a reviewer reads and one they learn to ignore. Getting it right is almost entirely a matter of asking git the right questions (merge base, not branch tip; working tree, not `HEAD`; untracked files count too), and none of those decisions are about running a subprocess.

So the subprocess is not here. Git arrives as an injected `GitRunner`, implemented by `apps/cli`. What lives in this package is which commands to run, how to read their output, and what the answer means — the part where a wrong choice produces a scan that reports nothing and exits `0`.

## Public surface

| Export                 | Kind     | Summary                                                                          |
| ---------------------- | -------- | -------------------------------------------------------------------------------- |
| `extractChangeSet`     | function | Base ref + `GitRunner` → the files and lines that changed, or a failure message  |
| `filterToChangedLines` | function | Keeps the violations that overlap a changed line                                 |
| `GitRunner`            | type     | `(args) => Promise<Result<string, string>>` — one git invocation, never throwing |
| `ChangeSet`            | type     | `ReadonlyMap<path, FileChange>`, keyed the way the scan names its files          |
| `FileChange`           | type     | One file's changed `ranges`, or `whole: true` for an untracked file              |
| `LineRange`            | type     | 1-based, inclusive at both ends                                                  |

## How it fits

- **Depends on:** `@argus/core` (the `Violation` and `Position` types it filters), `neverthrow`. No Node builtins — enforced by `orchestrator-no-infrastructure` in [`dependency-cruiser-rules.cjs`](../../dependency-cruiser-rules.cjs).
- **Consumed by:** `apps/cli`'s `check` command, which supplies the `GitRunner` and applies both halves. Phase 6's API server is the intended second consumer — routes call orchestrators.
- **Boundary rules:** other packages import this package's public entry only (`orchestrator-public-entry-only`).

## Usage

```ts
import { extractChangeSet, filterToChangedLines } from "@argus/orchestrator";

const changes = await extractChangeSet("main", gitRunner(projectRoot));
if (changes.isOk()) {
  const scanned = files.filter((file) => changes.value.has(file.relativePath));
  const reported = filterToChangedLines(violations, changes.value);
}
```

## Maintenance notes

- **The diff flags and the parser are one unit.** `DIFF_FLAGS` pins `--unified=0`, `a/`/`b/` prefixes, and no external diff driver; `unified-diff.ts` is written against exactly that. Relaxing a flag changes the grammar. Most of those flags defend against a user's git _config_ rather than against git — `diff.external`, a `textconv` filter, `color.ui = always` and `diff.noprefix` each produce output that parses to silently **fewer** changed lines.
- **Hunk bodies are skipped by counting, not by scanning for the next marker.** An added line reading `+++ b/other.ts` is indistinguishable from a header once it carries its own `+`, and mistaking one attributes a file's changes to the wrong path — a suppression nothing in the output would reveal.
- **Path vocabulary is string arithmetic on `git rev-parse --show-prefix`, deliberately not `realpath`.** On macOS the same directory is `/var/folders/…` to Node and `/private/var/folders/…` to git, so any comparison of absolute paths matches nothing and diff mode reports a confident, empty, exit-0 scan.
- **Untracked files are `whole: true` rather than skipped.** Git diffs only what it tracks; a brand-new file is where a fresh violation is most likely to be.
- Private workspace package; not published.
