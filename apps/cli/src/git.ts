import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { err, ok } from "neverthrow";
import type { GitRunner } from "@argus/orchestrator";

const execFileAsync = promisify(execFile);

/**
 * Cap on a single git invocation's stdout. Node's 1 MiB default is well under
 * a realistic branch diff — a few hundred changed files clears it — and
 * overflowing it kills the child, so the default would turn a large but
 * ordinary branch into a scan that reports nothing.
 */
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

/**
 * A {@link GitRunner} that shells out to the `git` on `PATH`, in `cwd`.
 *
 * The subprocess is all this contributes: which commands to run, and how to
 * read them, belong to `@argus/orchestrator`. Arguments are passed as an
 * array to `execFile` — never interpolated into a shell string — so a branch
 * name is data, not something a shell can act on.
 */
export function gitRunner(cwd: string): GitRunner {
  return async (args) => {
    try {
      const { stdout } = await execFileAsync("git", [...args], {
        cwd,
        encoding: "utf8",
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
      });
      return ok(stdout);
    } catch (cause) {
      return err(describe(cause));
    }
  };
}

/**
 * The most useful one-line account of a failed invocation: git's own message
 * where there is one, since "unknown revision or path not in the working
 * tree" tells the user far more about a mistyped ref than an exit code does.
 */
function describe(cause: unknown): string {
  if (typeof cause === "object" && cause !== null) {
    // Node reports a missing executable and a missing `cwd` identically, so
    // this stays true of both rather than naming the likelier one.
    if ("code" in cause && cause.code === "ENOENT") {
      return "could not run git — is it installed and on PATH?";
    }
    if ("stderr" in cause && typeof cause.stderr === "string") {
      const reported = firstLine(cause.stderr);
      if (reported !== "") {
        return reported;
      }
    }
  }
  return cause instanceof Error ? cause.message : String(cause);
}

/** git's first non-empty stderr line, without the `fatal: ` it prefixes most of them with. */
function firstLine(stderr: string): string {
  for (const line of stderr.split("\n")) {
    const trimmed = line.trim();
    if (trimmed !== "") {
      return trimmed.replace(/^fatal:\s*/, "");
    }
  }
  return "";
}
