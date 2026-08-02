import { describe, expect, it } from "vitest";
import { extractChangeSet } from "../src/index.js";
import type { ChangeSet, LineRange } from "../src/index.js";
import { diffText, fakeGit, nulSeparated } from "./support.js";
import type { GitScript } from "./support.js";

/** Runs the extractor against a script, asserting it succeeded. */
async function extract(script: GitScript): Promise<ChangeSet> {
  const git = fakeGit({ "merge-base": "abc123\n", ...script });
  const result = await extractChangeSet("main", git.run);
  return result._unsafeUnwrap();
}

/** The changed ranges for one path, as `[start, end]` pairs. */
function rangesOf(changes: ChangeSet, path: string): readonly (readonly [number, number])[] {
  const change = changes.get(path);
  expect(change, `no change recorded for ${path}`).toBeDefined();
  return (change?.ranges ?? []).map((range: LineRange) => [range.start, range.end] as const);
}

describe("extractChangeSet — git invocation", () => {
  it("diffs from the merge base, not from the base ref's tip", async () => {
    const git = fakeGit({ "merge-base": "abc123\n" });
    await extractChangeSet("main", git.run);

    expect(git.argsFor("merge-base")).toEqual(["merge-base", "main", "HEAD"]);
    // The resolved sha, and no second revision: a lone commit argument makes
    // git compare it against the *working tree*, which is what gets scanned.
    const diff = git.argsFor("diff") ?? [];
    expect(diff).not.toContain("main");
    const revisions = diff.slice(diff.indexOf("diff") + 1).filter((arg) => !arg.startsWith("-"));
    expect(revisions).toEqual(["abc123"]);
  });

  it("pins the diff into a parseable shape regardless of local git config", async () => {
    const git = fakeGit({ "merge-base": "abc123\n" });
    await extractChangeSet("main", git.run);

    expect(git.argsFor("diff")).toEqual(
      expect.arrayContaining([
        "--unified=0",
        // `--unified=0` is not sufficient on its own: diff.interHunkContext
        // reintroduces context, and diff.relative re-bases the paths.
        "--inter-hunk-context=0",
        "--no-relative",
        "--no-renames",
        "--no-ext-diff",
        "--no-textconv",
        "--no-color",
        "--src-prefix=a/",
        "--dst-prefix=b/",
        "--diff-filter=d",
      ]),
    );
  });

  it("asks for untracked paths from the repo root, not the current directory", async () => {
    const git = fakeGit({ "merge-base": "abc123\n" });
    await extractChangeSet("main", git.run);

    expect(git.argsFor("ls-files")).toEqual(
      expect.arrayContaining(["--others", "--exclude-standard", "--full-name", "-z", ":/"]),
    );
  });
});

describe("extractChangeSet — reading hunks", () => {
  it("records one range per hunk, on the new side", async () => {
    const changes = await extract({
      diff: diffText(
        "diff --git a/src/a.ts b/src/a.ts",
        "index 111..222 100644",
        "--- a/src/a.ts",
        "+++ b/src/a.ts",
        "@@ -10,0 +11,2 @@ class A {",
        "+  const x = 1;",
        "+  const y = 2;",
        "@@ -40,1 +42,1 @@",
        "-  was",
        "+  is",
      ),
    });

    expect(rangesOf(changes, "src/a.ts")).toEqual([
      [11, 12],
      [42, 42],
    ]);
  });

  it("reads a hunk header whose counts are omitted as a single line", async () => {
    const changes = await extract({
      diff: diffText("--- a/x.ts", "+++ b/x.ts", "@@ -7 +9 @@", "-old", "+new"),
    });

    expect(rangesOf(changes, "x.ts")).toEqual([[9, 9]]);
  });

  it("covers the whole of an added file", async () => {
    const changes = await extract({
      diff: diffText(
        "diff --git a/new.ts b/new.ts",
        "new file mode 100644",
        "--- /dev/null",
        "+++ b/new.ts",
        "@@ -0,0 +1,3 @@",
        "+one",
        "+two",
        "+three",
      ),
    });

    expect(rangesOf(changes, "new.ts")).toEqual([[1, 3]]);
  });

  it("merges hunks that touch, so adjacent edits are one range", async () => {
    const changes = await extract({
      diff: diffText(
        "--- a/x.ts",
        "+++ b/x.ts",
        "@@ -4,0 +5,1 @@",
        "+five",
        "@@ -4,0 +6,2 @@",
        "+six",
        "+seven",
      ),
    });

    expect(rangesOf(changes, "x.ts")).toEqual([[5, 7]]);
  });

  it("omits a file whose only change removed lines — nothing new is there to report", async () => {
    const changes = await extract({
      diff: diffText("--- a/x.ts", "+++ b/x.ts", "@@ -10,2 +9,0 @@", "-gone", "-also gone"),
    });

    expect(changes.has("x.ts")).toBe(false);
  });

  it("omits a binary file, which git reports without any hunks", async () => {
    const changes = await extract({
      diff: diffText(
        "diff --git a/logo.png b/logo.png",
        "index 111..222 100644",
        "Binary files a/logo.png and b/logo.png differ",
      ),
    });

    expect(changes.size).toBe(0);
  });

  it("ignores a deletion's /dev/null target", async () => {
    const changes = await extract({
      diff: diffText(
        "diff --git a/gone.ts b/gone.ts",
        "deleted file mode 100644",
        "--- a/gone.ts",
        "+++ /dev/null",
        "@@ -1,2 +0,0 @@",
        "-one",
        "-two",
      ),
    });

    expect(changes.size).toBe(0);
  });

  it("keeps files separate across a multi-file diff", async () => {
    const changes = await extract({
      diff: diffText(
        "--- a/a.ts",
        "+++ b/a.ts",
        "@@ -0,0 +3,1 @@",
        "+a",
        "--- a/b.ts",
        "+++ b/b.ts",
        "@@ -0,0 +8,1 @@",
        "+b",
      ),
    });

    expect(rangesOf(changes, "a.ts")).toEqual([[3, 3]]);
    expect(rangesOf(changes, "b.ts")).toEqual([[8, 8]]);
  });

  it("survives a 'no newline at end of file' marker without losing its place", async () => {
    const changes = await extract({
      diff: diffText(
        "--- a/x.ts",
        "+++ b/x.ts",
        "@@ -3,1 +3,1 @@",
        "-old",
        "\\ No newline at end of file",
        "+new",
        "\\ No newline at end of file",
        "--- a/y.ts",
        "+++ b/y.ts",
        "@@ -0,0 +1,1 @@",
        "+y",
      ),
    });

    expect(rangesOf(changes, "x.ts")).toEqual([[3, 3]]);
    expect(rangesOf(changes, "y.ts")).toEqual([[1, 1]]);
  });

  /**
   * The parser steps over hunk bodies by counting the lines the header
   * promises. Scanning for the next marker instead would read this file's own
   * added content as structure and attribute `y.ts`'s changes to `evil.ts` —
   * a wrong-file suppression that no output would reveal.
   */
  it("does not mistake added content for diff structure", async () => {
    const changes = await extract({
      diff: diffText(
        "--- a/x.ts",
        "+++ b/x.ts",
        "@@ -0,0 +1,3 @@",
        "+++ b/evil.ts",
        "+@@ -99,0 +99,9 @@",
        "+diff --git a/evil.ts b/evil.ts",
        "--- a/y.ts",
        "+++ b/y.ts",
        "@@ -0,0 +50,1 @@",
        "+y",
      ),
    });

    expect(rangesOf(changes, "x.ts")).toEqual([[1, 3]]);
    expect(rangesOf(changes, "y.ts")).toEqual([[50, 50]]);
    expect(changes.has("evil.ts")).toBe(false);
  });

  /**
   * git appends a TAB after a path containing a blank, for GNU-patch
   * compatibility, and no flag suppresses it. Keeping it produced a key no
   * discovered file could ever match, so every changed file with a space in
   * its name was silently dropped (#50 HIGH-1).
   */
  it("strips the tab git appends to a path containing a space", async () => {
    const changes = await extract({
      diff: diffText("--- a/has space.ts\t", "+++ b/has space.ts\t", "@@ -0,0 +4,1 @@", "+x"),
    });

    expect(rangesOf(changes, "has space.ts")).toEqual([[4, 4]]);
  });

  it("strips the tab from a quoted path, where it follows the closing quote", async () => {
    const changes = await extract({
      diff: diffText(String.raw`+++ "b/sp ace and \"q\".ts"` + "\t", "@@ -0,0 +1,1 @@", "+x"),
    });

    expect(rangesOf(changes, 'sp ace and "q".ts')).toEqual([[1, 1]]);
  });

  /**
   * `diff.interHunkContext` fuses nearby hunks and emits the lines between
   * them as context, so the header's counts exceed the body length. Counting
   * blindly would run past the body and swallow the next file's `+++` line,
   * attributing its changes to this one and losing it entirely (#50 MED-1).
   * The flags now prevent this; the backstop keeps a *lost file* from being
   * the failure mode if some other setting reintroduces context.
   */
  it("re-synchronises when context lines appear despite --unified=0", async () => {
    const changes = await extract({
      diff: diffText(
        "--- a/fused.ts",
        "+++ b/fused.ts",
        "@@ -2,7 +2,7 @@ a",
        "-b",
        "+B",
        " c",
        " d",
        " e",
        " f",
        " g",
        "-h",
        "+H",
        "diff --git a/next.ts b/next.ts",
        "--- a/next.ts",
        "+++ b/next.ts",
        "@@ -0,0 +30,1 @@",
        "+n",
      ),
    });

    // Over-reporting the context lines is the safe direction for a linter.
    expect(rangesOf(changes, "fused.ts")).toEqual([[2, 8]]);
    // The point of the test: the second file survives.
    expect(rangesOf(changes, "next.ts")).toEqual([[30, 30]]);
  });

  it("decodes a path git wrote in C-quoted form", async () => {
    const changes = await extract({
      diff: diffText(
        String.raw`--- a/caf\303\251.ts`,
        String.raw`+++ "b/caf\303\251.ts"`,
        "@@ -0,0 +2,1 @@",
        "+x",
      ),
    });

    expect(rangesOf(changes, "café.ts")).toEqual([[2, 2]]);
  });

  it("decodes the simple escapes too", async () => {
    const changes = await extract({
      diff: diffText(String.raw`+++ "b/say \"hi\".ts"`, "@@ -0,0 +1,1 @@", "+x"),
    });

    expect(rangesOf(changes, 'say "hi".ts')).toEqual([[1, 1]]);
  });

  /**
   * git does not emit these, so the branches exist to keep an unreadable path
   * from being attributed to the *previous* file — a wrong-file range being
   * strictly worse than a missing one. Recorded so the choice is visible if a
   * future change makes them reachable.
   */
  it.each([
    ["an unterminated quote", String.raw`+++ "b/x.ts`],
    ["a trailing backslash", String.raw`+++ "b/x.ts\"`],
    ["an escape that is neither known nor octal", String.raw`+++ "b/x\9zz.ts"`],
  ])("drops a file whose quoted path has %s", async (_case, header) => {
    const changes = await extract({ diff: diffText(header, "@@ -0,0 +1,1 @@", "+x") });

    expect(changes.size).toBe(0);
  });
});

describe("extractChangeSet — untracked files", () => {
  it("marks an untracked file changed in full", async () => {
    const changes = await extract({ "ls-files": nulSeparated("src/brand-new.ts") });

    expect(changes.get("src/brand-new.ts")).toEqual({ ranges: [], whole: true });
  });

  it("ignores the empty trailing field of -z output", async () => {
    const changes = await extract({ "ls-files": nulSeparated("a.ts", "b.ts") });

    expect([...changes.keys()]).toEqual(["a.ts", "b.ts"]);
  });

  it("reports nothing changed when there is neither a diff nor an untracked file", async () => {
    expect((await extract({})).size).toBe(0);
  });
});

describe("extractChangeSet — path vocabulary", () => {
  it("re-expresses repo-relative paths against the directory git ran in", async () => {
    const changes = await extract({
      "rev-parse": "sub/project/\n",
      diff: diffText("+++ b/sub/project/src/a.ts", "@@ -0,0 +1,1 @@", "+a"),
      "ls-files": nulSeparated("sub/project/new.ts"),
    });

    expect([...changes.keys()].sort()).toEqual(["new.ts", "src/a.ts"]);
  });

  it("drops changes outside that directory", async () => {
    const changes = await extract({
      "rev-parse": "sub/\n",
      diff: diffText(
        "+++ b/elsewhere/a.ts",
        "@@ -0,0 +1,1 @@",
        "+a",
        "+++ b/sub/b.ts",
        "@@ -0,0 +1,1 @@",
        "+b",
      ),
    });

    expect([...changes.keys()]).toEqual(["b.ts"]);
  });

  it("leaves paths alone at the repo root, where the prefix is empty", async () => {
    const changes = await extract({
      "rev-parse": "\n",
      diff: diffText("+++ b/src/a.ts", "@@ -0,0 +1,1 @@", "+a"),
    });

    expect([...changes.keys()]).toEqual(["src/a.ts"]);
  });
});

describe("extractChangeSet — failures", () => {
  it("fails when git cannot say where the work tree is", async () => {
    const git = fakeGit({ fails: { "rev-parse": "not a git repository" } });

    const result = await extractChangeSet("main", git.run);

    expect(result._unsafeUnwrapErr()).toContain("not inside a git work tree");
    expect(result._unsafeUnwrapErr()).toContain("not a git repository");
  });

  it("names the ref when there is no merge base to compare from", async () => {
    const git = fakeGit({ fails: { "merge-base": "unknown revision 'mian'" } });

    const result = await extractChangeSet("mian", git.run);

    expect(result._unsafeUnwrapErr()).toContain("cannot compare against 'mian'");
    expect(result._unsafeUnwrapErr()).toContain("unknown revision");
  });

  it("fails on an empty merge base rather than diffing against the working tree", async () => {
    // `git merge-base` exits 1 with no output for unrelated histories. Passing
    // that empty string on to `git diff` would compare HEAD against itself and
    // report a confident, entirely wrong "nothing changed".
    const git = fakeGit({ "merge-base": "\n" });

    const result = await extractChangeSet("main", git.run);

    expect(result._unsafeUnwrapErr()).toContain("shares no history");
    expect(git.argsFor("diff")).toBeUndefined();
  });

  it("fails when the diff itself cannot be read", async () => {
    const git = fakeGit({ "merge-base": "abc\n", fails: { diff: "bad object" } });

    expect((await extractChangeSet("main", git.run))._unsafeUnwrapErr()).toContain(
      "could not read the diff",
    );
  });

  it("fails when untracked files cannot be listed", async () => {
    const git = fakeGit({ "merge-base": "abc\n", fails: { "ls-files": "index locked" } });

    expect((await extractChangeSet("main", git.run))._unsafeUnwrapErr()).toContain(
      "could not list untracked files",
    );
  });
});
