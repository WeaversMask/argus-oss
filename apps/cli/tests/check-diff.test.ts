import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { scanReportSchema } from "@argus/api-contracts";
import type { ScanReportPayload } from "@argus/api-contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCheck } from "../src/check.js";
import type { CheckOptions } from "../src/check.js";
import { captureIO, gitRepo, tempDir } from "./support.js";
import type { CaptureIO, Git } from "./support.js";

/**
 * `argus check --diff <ref>` end to end, against a real repository.
 *
 * The extractor's own suite drives canned git output; this one exists for the
 * things only a real repository can answer — that the commands are accepted by
 * a real git, that the merge base is what actually gets compared, and that the
 * path git reports lines up with the path the scanner discovered. macOS makes
 * that last one non-trivial: `os.tmpdir()` is `/var/folders/…`, which git
 * resolves through the `/var` symlink to `/private/var/folders/…`, so any
 * comparison of absolute paths would silently match nothing here.
 */

const JSON_DIFF = (base: string): CheckOptions => ({
  colour: false,
  format: "json",
  diffBase: base,
});

const FULL_SCAN: CheckOptions = { colour: false, format: "json" };

/** An exported function with no doc comment — one `docs/require-jsdoc` violation. */
function undocumented(name: string): string {
  return `export function ${name}() {\n  return "${name}";\n}\n`;
}

let dir: string;
let cleanup: () => void;
let git: Git;

function write(relative: string, content: string): void {
  const full = path.join(dir, relative);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function commit(message: string): void {
  git("add", "-A");
  git("commit", "-m", message);
}

/** The parsed JSON report on stdout — validated against the wire contract. */
function report(io: CaptureIO): ScanReportPayload {
  return scanReportSchema.parse(JSON.parse(io.out()));
}

/** Every violation's `file:startLine`, sorted for a stable assertion. */
function sites(io: CaptureIO): readonly string[] {
  return report(io)
    .violations.map((violation) => `${violation.file}:${violation.position.startLine}`)
    .sort();
}

beforeEach(() => {
  ({ dir, cleanup } = tempDir());
  git = gitRepo(dir);
});

afterEach(() => {
  cleanup();
});

describe("check --diff", () => {
  it("reports only the violation on the changed line, not the one already there", async () => {
    write("src/a.ts", undocumented("old"));
    commit("baseline");
    write("src/a.ts", `${undocumented("old")}\n${undocumented("fresh")}`);

    const full = captureIO(dir);
    expect(await runCheck(".", FULL_SCAN, full)).toBe(1);
    expect(sites(full)).toEqual(["src/a.ts:1", "src/a.ts:5"]);

    const diffed = captureIO(dir);
    expect(await runCheck(".", JSON_DIFF("main"), diffed)).toBe(1);
    expect(sites(diffed)).toEqual(["src/a.ts:5"]);
  });

  it("exits 0 when every violation in a changed file predates the change", async () => {
    write("src/a.ts", undocumented("old"));
    commit("baseline");
    // A comment appended below the function: the file changed, the violation
    // did not move, and nothing on the changed line is wrong.
    write("src/a.ts", `${undocumented("old")}\n// a note\n`);

    const io = captureIO(dir);

    expect(await runCheck(".", JSON_DIFF("main"), io)).toBe(0);
    expect(report(io).violations).toEqual([]);
    // The file was still scanned — the narrowing is of findings, not of work.
    expect(report(io).summary.filesScanned).toBe(1);
  });

  it("leaves out files the branch never touched", async () => {
    write("src/untouched.ts", undocumented("untouched"));
    write("src/changed.ts", undocumented("changed"));
    commit("baseline");
    write("src/changed.ts", `${undocumented("changed")}\n${undocumented("added")}`);

    const io = captureIO(dir);

    expect(await runCheck(".", JSON_DIFF("main"), io)).toBe(1);
    expect(report(io).summary.filesScanned).toBe(1);
    expect(sites(io)).toEqual(["src/changed.ts:5"]);
  });

  /**
   * The end-to-end half of #50 HIGH-1. Only a real `git` produces the
   * trailing tab, so only a real repository can prove it is handled.
   */
  it("scans a changed file whose name contains a space", async () => {
    write("src/has space.ts", undocumented("spaced"));
    commit("baseline");
    write("src/has space.ts", `${undocumented("spaced")}\n${undocumented("added")}`);

    const io = captureIO(dir);

    expect(await runCheck(".", JSON_DIFF("main"), io)).toBe(1);
    expect(sites(io)).toEqual(["src/has space.ts:5"]);
  });

  /**
   * The end-to-end half of the second review pass's MED-1. `GIT_DIFF_OPTS`
   * is the one context-reintroducing vector the flags cannot pin, and with
   * the walk desynced a file whose own content forges a `---`/`+++` pair used
   * to hand its remaining hunks to the forged path — losing the violation on
   * them entirely. Only a real `git` honours the variable, so only a real
   * repository can prove the parser now holds.
   */
  it("keeps its bearings when content forges a header and git reintroduces context", async () => {
    // The forged pair needs the *rendered* lines to be `--- …` / `+++ …`, so
    // the source lines themselves must begin `-- ` and `++ `. Both are valid
    // TypeScript (prefix decrement/increment), so the file still parses —
    // writing them as comments, as the first attempt did, renders `-// -- …`
    // and forges nothing, which made the test pass without testing anything.
    const head = "const b = 1;\nconst evil = { ts: 2 };\nlet x = 3;\n\n";
    const filler = Array.from({ length: 40 }, (_, i) => `const v${i + 6} = ${i};`).join("\n");
    write("src/a.ts", `${head}-- x;\n${filler}\nexport const tail = 1;\n`);
    commit("baseline");
    write("src/a.ts", `${head}++ b/evil.ts;\n${filler}\n${undocumented("added")}`);

    // `gitRunner` gives the child no explicit env, so it inherits this
    // process's — `captureIO`'s env would never reach git, and a test written
    // that way passes without exercising anything.
    const io = captureIO(dir);
    const previous = process.env["GIT_DIFF_OPTS"];
    process.env["GIT_DIFF_OPTS"] = "-u3";
    try {
      expect(await runCheck(".", JSON_DIFF("main"), io)).toBe(1);
    } finally {
      if (previous === undefined) {
        delete process.env["GIT_DIFF_OPTS"];
      } else {
        process.env["GIT_DIFF_OPTS"] = previous;
      }
    }
    // The violation lives ~46 lines below the forged header. Before the fix it
    // was attributed to `evil.ts` and silently dropped.
    expect(sites(io)).toEqual(["src/a.ts:46"]);
  });

  it("scans a file that is still untracked", async () => {
    write("src/committed.ts", "export const value = 1;\n");
    commit("baseline");
    write("src/brand-new.ts", undocumented("brandNew"));

    const io = captureIO(dir);

    expect(await runCheck(".", JSON_DIFF("main"), io)).toBe(1);
    expect(sites(io)).toEqual(["src/brand-new.ts:1"]);
  });

  it("compares against the merge base, so changes made to the base ref are not attributed", async () => {
    write("src/a.ts", "export const value = 1;\n");
    commit("baseline");
    git("switch", "-c", "feature");
    write("src/mine.ts", undocumented("mine"));
    commit("my work");

    // Someone else lands an unrelated violation on main after the branch point.
    git("switch", "main");
    write("src/theirs.ts", undocumented("theirs"));
    commit("their work");
    git("switch", "feature");

    const io = captureIO(dir);

    expect(await runCheck(".", JSON_DIFF("main"), io)).toBe(1);
    expect(sites(io)).toEqual(["src/mine.ts:1"]);
  });

  it("counts uncommitted work in the diff, since that is what is on disk", async () => {
    write("src/a.ts", "export const value = 1;\n");
    commit("baseline");
    git("switch", "-c", "feature");
    write("src/committed.ts", undocumented("committed"));
    commit("committed half");
    write("src/working.ts", undocumented("working"));
    git("add", "-A");

    const io = captureIO(dir);

    expect(await runCheck(".", JSON_DIFF("main"), io)).toBe(1);
    expect(sites(io)).toEqual(["src/committed.ts:1", "src/working.ts:1"]);
  });

  it("respects the scan path as well as the diff", async () => {
    write("src/a.ts", undocumented("a"));
    write("lib/b.ts", undocumented("b"));
    commit("baseline");
    write("src/a.ts", `${undocumented("a")}\n${undocumented("a2")}`);
    write("lib/b.ts", `${undocumented("b")}\n${undocumented("b2")}`);

    const io = captureIO(dir);

    expect(await runCheck("lib", JSON_DIFF("main"), io)).toBe(1);
    expect(sites(io)).toEqual(["lib/b.ts:5"]);
  });

  it("says so, and exits 0, when nothing changed", async () => {
    write("src/a.ts", undocumented("old"));
    commit("baseline");

    const io = captureIO(dir);

    expect(await runCheck(".", JSON_DIFF("main"), io)).toBe(0);
    expect(io.err()).toContain("no source files under . changed since main");
    // stdout still carries a parseable report — a `--format json` consumer
    // must never receive an empty stream from a scan that succeeded.
    expect(report(io).summary.filesScanned).toBe(0);
  });
});

describe("check --diff — failures", () => {
  it("fails loudly on a ref that does not exist, rather than scanning everything", async () => {
    write("src/a.ts", undocumented("old"));
    commit("baseline");

    const io = captureIO(dir);

    expect(await runCheck(".", JSON_DIFF("mian"), io)).toBe(2);
    expect(io.err()).toContain("argus: --diff mian:");
    expect(io.out()).toBe("");
  });

  /**
   * A `../` path can never be a change-set key, so every file would be
   * narrowed away and the run would exit 0 claiming nothing changed (#50
   * LOW-1). Without `--diff` the same invocation still scans normally.
   */
  it("fails on a scan path above the project root rather than reporting nothing", async () => {
    write("src/inside.ts", "export const value = 1;\n");
    write("above.ts", undocumented("above"));
    commit("baseline");
    write("above.ts", `${undocumented("above")}\n${undocumented("added")}`);

    // No config anywhere, so the project root falls back to the cwd — and the
    // scan target is its parent, putting `above.ts` at `../above.ts`.
    const io = captureIO(path.join(dir, "src"));

    expect(await runCheck("..", JSON_DIFF("main"), io)).toBe(2);
    expect(io.err()).toContain("outside the project root");

    // The same invocation without --diff is unaffected.
    const full = captureIO(path.join(dir, "src"));
    expect(await runCheck("..", FULL_SCAN, full)).toBe(1);
  });

  it("fails when the scan is not inside a git work tree", async () => {
    const { dir: bare, cleanup: cleanBare } = tempDir();
    try {
      writeFileSync(path.join(bare, "a.ts"), undocumented("a"));
      const io = captureIO(bare);

      expect(await runCheck(".", JSON_DIFF("main"), io)).toBe(2);
      expect(io.err()).toContain("not inside a git work tree");
    } finally {
      cleanBare();
    }
  });
});
