import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import type { ChangeSet, FileChange } from "./change-set.js";
import { parseDiff } from "./unified-diff.js";

/**
 * Diff mode's first half: turning a git base ref into the set of files and
 * lines a scan should cover.
 *
 * Every git invocation arrives through the injected {@link GitRunner}, so
 * this module owns *which* commands to run and *how to read* their output —
 * the part that is easy to get wrong — while the subprocess itself stays in
 * the app that wires it. That also makes the whole extraction testable
 * against canned git output, with no temporary repository per case.
 */

/**
 * Runs `git` with these arguments and resolves its stdout, or a message
 * describing why it could not. Implementations must not throw.
 */
export type GitRunner = (args: readonly string[]) => Promise<Result<string, string>>;

/**
 * Flags that pin the diff into the one shape {@link parseDiff} can read.
 *
 * Most of these defend against configuration rather than against git: a
 * repository or user that sets `diff.external`, a `textconv` filter,
 * `color.ui = always`, `diff.noprefix`, or `diff.mnemonicPrefix` would
 * otherwise hand us output that parses to silently *fewer* changed lines —
 * i.e. a scan that reports nothing and exits 0.
 */
const DIFF_FLAGS: readonly string[] = [
  "--no-ext-diff",
  "--no-textconv",
  "--no-color",
  "--src-prefix=a/",
  "--dst-prefix=b/",
  // Zero context: every emitted line is a line that actually changed.
  "--unified=0",
  // A pure rename produces no hunks, so a renamed file would arrive with zero
  // changed lines and have all of its violations suppressed. Disabling
  // detection reports it as an addition instead — the whole new path is
  // treated as new work, which is the conservative direction for a linter.
  "--no-renames",
  // Deleted files are not on disk for the scanner to open.
  "--diff-filter=d",
];

/**
 * The files and lines that changed between `baseRef` and the working tree.
 *
 * The comparison runs from the **merge base** of `baseRef` and `HEAD`, not
 * from `baseRef`'s tip: on a branch cut days ago, a two-dot `git diff main`
 * also reports everything that landed on `main` since — as reversals — and a
 * scan would then flag work the caller never touched. The right-hand side is
 * the working tree rather than `HEAD`, because the working tree is what the
 * scanner reads: line numbers have to match the bytes on disk, so uncommitted
 * edits must be part of the diff.
 *
 * Untracked files are added separately (`FileChange.whole`) — git diffs only
 * what it tracks, and a new file nobody has staged yet is the most likely
 * place for a fresh violation to be hiding.
 */
export async function extractChangeSet(
  baseRef: string,
  git: GitRunner,
): Promise<Result<ChangeSet, string>> {
  const prefix = await git(["rev-parse", "--show-prefix"]);
  if (prefix.isErr()) {
    return err(`not inside a git work tree (${prefix.error})`);
  }

  const base = await resolveMergeBase(baseRef, git);
  if (base.isErr()) {
    return err(base.error);
  }

  const changes = await collectChanges(base.value, baseRef, git);
  return changes.map((found) => relativeToPrefix(found, prefix.value.trim()));
}

/** The commit `baseRef` and `HEAD` diverged from. */
async function resolveMergeBase(baseRef: string, git: GitRunner): Promise<Result<string, string>> {
  const mergeBase = await git(["merge-base", baseRef, "HEAD"]);
  if (mergeBase.isErr()) {
    return err(`cannot compare against '${baseRef}' (${mergeBase.error})`);
  }
  const base = mergeBase.value.trim();
  if (base === "") {
    // `git merge-base` exits 1 with no output for unrelated histories.
    // Passing that empty string on to `git diff` would compare HEAD against
    // itself and report a confident, entirely wrong "nothing changed".
    return err(`cannot compare against '${baseRef}': it shares no history with HEAD`);
  }
  return ok(base);
}

/** Everything changed since `base`, keyed by repo-root-relative path. */
async function collectChanges(
  base: string,
  baseRef: string,
  git: GitRunner,
): Promise<Result<ReadonlyMap<string, FileChange>, string>> {
  const diff = await git([
    "-c",
    // Without this, git renders any non-ASCII path as octal escapes. We can
    // read those (see unquotePath) but there is no reason to make it work
    // harder than the failure mode deserves.
    "core.quotePath=false",
    "diff",
    ...DIFF_FLAGS,
    base,
    "--",
  ]);
  if (diff.isErr()) {
    return err(`could not read the diff against '${baseRef}' (${diff.error})`);
  }

  // `--full-name` prints repo-root-relative paths (the diff's vocabulary) and
  // `-- :/` lifts ls-files out of its default "current directory and below"
  // scope, so both halves describe the same region whatever directory git was
  // run from. `-z` sidesteps quoting entirely.
  const untracked = await git([
    "ls-files",
    "--others",
    "--exclude-standard",
    "--full-name",
    "-z",
    "--",
    ":/",
  ]);
  if (untracked.isErr()) {
    return err(`could not list untracked files (${untracked.error})`);
  }

  const changes = new Map<string, FileChange>();
  for (const [path, ranges] of parseDiff(diff.value)) {
    changes.set(path, { ranges, whole: false });
  }
  for (const path of untracked.value.split("\0")) {
    if (path !== "") {
      changes.set(path, { ranges: [], whole: true });
    }
  }
  return ok(changes);
}

/**
 * Re-expresses repo-root-relative keys against the directory git ran in,
 * dropping anything outside it. `--show-prefix` is empty at the repo root and
 * otherwise ends in `/`, so this is a plain string operation — deliberately
 * not a filesystem one, since resolving real paths on macOS turns `/tmp` into
 * `/private/tmp` on one side of the comparison and not the other.
 */
function relativeToPrefix(changes: ReadonlyMap<string, FileChange>, prefix: string): ChangeSet {
  if (prefix === "") {
    return changes;
  }
  const scoped = new Map<string, FileChange>();
  for (const [path, change] of changes) {
    if (path.startsWith(prefix)) {
      scoped.set(path.slice(prefix.length), change);
    }
  }
  return scoped;
}
