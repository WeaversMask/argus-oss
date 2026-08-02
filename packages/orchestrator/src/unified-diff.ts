import { mergeRanges } from "./change-set.js";
import type { LineRange } from "./change-set.js";

/**
 * Reading `git diff` output. Text in, changed line ranges out — no git, no
 * filesystem, no decisions about what to diff.
 *
 * Written against the flag set `diff-extractor.ts` pins (`--unified=0`,
 * `a/`/`b/` prefixes, no external diff driver). Those flags and this parser
 * are one unit: relaxing any of them changes the grammar below.
 */

/** One hunk header's account of the new side. */
interface Hunk {
  readonly oldCount: number;
  readonly newStart: number;
  readonly newCount: number;
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/**
 * Changed line ranges per repo-root-relative path.
 *
 * Hunk bodies are skipped by **counting** the lines the header promises
 * rather than by scanning for the next marker. An added line whose content
 * begins with `+++ ` or `@@ ` is indistinguishable from a header once it
 * carries its own `+`, and treating one as a header would silently attribute
 * the rest of a file's changes to the wrong path.
 */
export function parseDiff(text: string): ReadonlyMap<string, readonly LineRange[]> {
  const found = new Map<string, LineRange[]>();
  const lines = text.split("\n");
  let file: string | undefined;
  // Set when a hunk body did not match its header's counts, cleared at the
  // next file entry. While it holds, no `+++` line may change the current
  // target — see the note above FILE_ENTRY.
  let desynced = false;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.startsWith(FILE_ENTRY)) {
      desynced = false;
      index++;
      continue;
    }
    if (!desynced && isTargetHeader(lines, index)) {
      file = targetPath(line.slice(4));
      index++;
      continue;
    }

    // Parsed even when there is no target path to attribute it to, because
    // skipping the body is what keeps the walk aligned — a hunk belonging to
    // a file we ignore still has to be stepped over as a unit.
    const hunk = parseHunkHeader(line);
    if (hunk === undefined) {
      index++;
      continue;
    }
    record(found, file, hunk);
    const body = skipHunkBody(lines, index + 1, hunk.oldCount + hunk.newCount);
    desynced = desynced || !body.aligned;
    index = body.index;
  }

  const merged = new Map<string, readonly LineRange[]>();
  for (const [path, ranges] of found) {
    merged.set(path, mergeRanges(ranges));
  }
  return merged;
}

/**
 * The line that opens each file's entry in `git diff` output. Content can
 * never impersonate it — a body line always carries its own `+`, `-` or `\` —
 * which makes it the one marker that is trustworthy even mid-desync.
 *
 * That matters because the `---`/`+++` pairing is **not** sufficient on its
 * own. A removed line reading `-- x` is emitted as `--- x`, and an added line
 * reading `++ b/evil.ts` right after it as `+++ b/evil.ts` — a pair the
 * pairing check accepts. Reproduced (independent review, #50 second pass):
 * with the walk desynced, that spoof stole the file's remaining hunks and the
 * violations on them vanished. Refusing to re-target until the next real file
 * entry means a desync can only ever over-report, which is the claim the
 * counting comment above has always made.
 */
const FILE_ENTRY = "diff --git ";

/** Adds a hunk's new-side range to `file`'s list, if there is a file and a new side. */
function record(found: Map<string, LineRange[]>, file: string | undefined, hunk: Hunk): void {
  if (file === undefined || hunk.newCount === 0) {
    return;
  }
  const ranges = found.get(file) ?? [];
  ranges.push({ start: hunk.newStart, end: hunk.newStart + hunk.newCount - 1 });
  found.set(file, ranges);
}

/**
 * Whether the line at `index` is a real `+++` header rather than added
 * content that looks like one.
 *
 * git always emits the `---`/`+++` pair on adjacent lines, so requiring the
 * partner is what tells them apart, and it is a necessary check — but **not
 * a sufficient one**, which is why `parseDiff` also refuses to re-target
 * while desynced. Content can forge the pair: a removed line `-- x` renders
 * as `--- x` and an added line `++ b/evil.ts` right after it as
 * `+++ b/evil.ts`. See FILE_ENTRY for the guard that actually closes it.
 */
function isTargetHeader(lines: readonly string[], index: number): boolean {
  return (lines[index] ?? "").startsWith("+++ ") && (lines[index - 1] ?? "").startsWith("--- ");
}

function parseHunkHeader(line: string): Hunk | undefined {
  const match = HUNK_HEADER.exec(line);
  // Group 3 is guaranteed by the pattern; the explicit check is what tells
  // the compiler so. Groups 2 and 4 are the counts, which git omits when
  // they are exactly 1.
  const newStart = match?.[3];
  if (newStart === undefined) {
    return undefined;
  }
  return {
    oldCount: Number(match?.[2] ?? "1"),
    newStart: Number(newStart),
    newCount: Number(match?.[4] ?? "1"),
  };
}

/**
 * Index of the first line after a hunk body of `count` changed lines.
 * "\ No newline at end of file" is a note about the preceding line, not a
 * line of its own, so it does not count against the total.
 *
 * The count is the primary mechanism; the shape check is a backstop. Under
 * the pinned flags a body line can only be `+`, `-`, or `\`, so anything else
 * means the header's count and the body have disagreed — and continuing to
 * count would swallow the *next* file's `+++` line and attribute its changes
 * to this one. Stopping instead re-synchronises the walk on the next header.
 * That is not hypothetical: `diff.interHunkContext` and `GIT_DIFF_OPTS` both
 * reintroduce context lines that `--unified=0` is supposed to have removed
 * (independent review, #50 MED-1). Counting context as changed over-reports,
 * which is the safe direction for a linter; losing a whole file is not.
 */
function skipHunkBody(lines: readonly string[], start: number, count: number): BodyWalk {
  let index = start;
  let remaining = count;
  while (remaining > 0 && index < lines.length) {
    const line = lines[index] ?? "";
    if (!isBodyLine(line)) {
      return { index, aligned: false };
    }
    if (!line.startsWith("\\")) {
      remaining--;
    }
    index++;
  }
  return { index, aligned: true };
}

/** Where a hunk body ended, and whether it ended where its header promised. */
interface BodyWalk {
  readonly index: number;
  /** `false` when the body held a line the pinned flags say cannot be in one. */
  readonly aligned: boolean;
}

/** Whether a line can belong to a hunk body produced with {@link DIFF_FLAGS}. */
function isBodyLine(line: string): boolean {
  return line.startsWith("+") || line.startsWith("-") || line.startsWith("\\");
}

/**
 * The new-side path from a `+++ ` line, or `undefined` when the diff has no
 * new side (`/dev/null`, i.e. a deletion) or the line is unreadable.
 *
 * **The trailing tab is not decoration.** When a path contains a blank, git
 * appends a TAB after it — after the closing quote, for a quoted one — for
 * GNU-patch compatibility, and no flag turns that off. Keeping it produced a
 * change-set key of `"has space.ts\t"`, which matches no discovered file, so
 * every changed file whose name contains a space was silently dropped from
 * the scan (independent review, #50 HIGH-1 — reproduced on git 2.49).
 */
function targetPath(line: string): string | undefined {
  const target = line.endsWith("\t") ? line.slice(0, -1) : line;
  const unquoted = target.startsWith('"') ? unquotePath(target) : target;
  if (unquoted === undefined || !unquoted.startsWith("b/")) {
    return undefined;
  }
  return unquoted.slice(2);
}

const C_ESCAPES: ReadonlyMap<string, number> = new Map([
  ["a", 0x07],
  ["b", 0x08],
  ["f", 0x0c],
  ["n", 0x0a],
  ["r", 0x0d],
  ["t", 0x09],
  ["v", 0x0b],
  ['"', 0x22],
  ["\\", 0x5c],
]);

/**
 * Decodes a path git wrote in C-quoted form. Even with `core.quotePath=false`
 * git still quotes a path containing a quote, a backslash, or a control
 * character — and an unreadable path would be dropped from the change set,
 * which silently under-scans rather than failing.
 *
 * Octal escapes are *bytes*, not characters (a single accented letter is two
 * of them), so they are decoded byte-wise and only then read as UTF-8.
 */
function unquotePath(quoted: string): string | undefined {
  if (!quoted.endsWith('"') || quoted.length < 2) {
    return undefined;
  }
  const bytes: number[] = [];
  const body = quoted.slice(1, -1);

  for (let index = 0; index < body.length; index++) {
    const char = body[index] ?? "";
    if (char !== "\\") {
      // Non-escaped text is raw UTF-8 that the caller already decoded.
      for (const byte of new TextEncoder().encode(char)) {
        bytes.push(byte);
      }
      continue;
    }
    const consumed = decodeEscape(body, index + 1, bytes);
    if (consumed === undefined) {
      return undefined;
    }
    index += consumed;
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Appends the byte one escape stands for and returns how many characters it
 * occupied after the backslash, or `undefined` if it is not an escape git
 * would have written.
 */
function decodeEscape(body: string, at: number, bytes: number[]): number | undefined {
  const next = body[at];
  if (next === undefined) {
    return undefined;
  }
  const simple = C_ESCAPES.get(next);
  if (simple !== undefined) {
    bytes.push(simple);
    return 1;
  }
  const octal = body.slice(at, at + 3);
  if (!/^[0-7]{3}$/.test(octal)) {
    return undefined;
  }
  bytes.push(Number.parseInt(octal, 8));
  return 3;
}
