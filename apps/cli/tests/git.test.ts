import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gitRunner } from "../src/git.js";
import { gitRepo, tempDir } from "./support.js";

/**
 * The subprocess half of diff mode. `@argus/orchestrator` decides which
 * commands to run; this only has to run them and report what happened, so
 * these tests drive a real `git` and never a stub of one.
 */

let dir: string;
let cleanup: () => void;

beforeEach(() => {
  ({ dir, cleanup } = tempDir());
  gitRepo(dir);
});

afterEach(() => {
  cleanup();
});

describe("gitRunner", () => {
  it("returns stdout from a command that succeeds", async () => {
    const result = await gitRunner(dir)(["rev-parse", "--is-inside-work-tree"]);

    expect(result._unsafeUnwrap().trim()).toBe("true");
  });

  it("runs in the directory it was given, not the process's", async () => {
    const result = await gitRunner(dir)(["rev-parse", "--show-prefix"]);

    // Empty: the runner's cwd is the repository root. It is the *absence* of
    // a path here that matters — the alternative, resolving real paths, would
    // disagree with itself on macOS, where the temp dir reached through
    // `/var` is the same directory git reports under `/private/var`.
    expect(result._unsafeUnwrap().trim()).toBe("");
  });

  it("reports git's own message for a ref that does not exist", async () => {
    const result = await gitRunner(dir)(["merge-base", "nonexistent-ref", "HEAD"]);

    const message = result._unsafeUnwrapErr();
    expect(message).toContain("nonexistent-ref");
    // git prefixes almost everything with "fatal: "; repeating it inside
    // `argus: --diff …: fatal: …` reads as two tools failing, not one.
    expect(message.startsWith("fatal:")).toBe(false);
  });

  it("fails rather than throws outside a repository", async () => {
    const { dir: bare, cleanup: cleanBare } = tempDir();
    try {
      const result = await gitRunner(bare)(["rev-parse", "--show-prefix"]);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toContain("not a git repository");
    } finally {
      cleanBare();
    }
  });

  it("reports a runnable-git problem when the command cannot start at all", async () => {
    const result = await gitRunner(path.join(dir, "no-such-directory"))(["status"]);

    expect(result._unsafeUnwrapErr()).toContain("could not run git");
  });

  /**
   * Arguments reach `execFile` as an array, so there is no shell to interpret
   * them. A branch name is data — this is the difference between a mistyped
   * `--diff` argument being an error and it being an instruction.
   */
  it("treats a ref containing shell metacharacters as a ref", async () => {
    const result = await gitRunner(dir)(["rev-parse", "--verify", "x; touch pwned"]);

    expect(result.isErr()).toBe(true);
    const { existsSync } = await import("node:fs");
    expect(existsSync(path.join(dir, "pwned"))).toBe(false);
  });
});
