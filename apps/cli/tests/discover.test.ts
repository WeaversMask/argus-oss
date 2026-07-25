import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverFiles } from "../src/discover.js";
import { tempDir } from "./support.js";

let dir: string;
let cleanup: () => void;

function write(relative: string, content = "//\n"): void {
  const full = path.join(dir, relative);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  ({ dir, cleanup } = tempDir());
  write("src/a.ts");
  write("src/b.js");
  write("src/nested/c.ts");
  write("src/skip.py");
  write("notes.md");
  write("node_modules/dep/x.ts");
  write("dist/out.ts");
  write("ignoreme/e.ts");
});

afterEach(() => {
  cleanup();
});

describe("discoverFiles", () => {
  it("keeps active-language files, sorted, and prunes default + configured ignores", async () => {
    const result = await discoverFiles(dir, {
      cwd: dir,
      languages: ["typescript", "javascript"],
      ignore: ["ignoreme/**"],
    });

    const relatives = result._unsafeUnwrap().map((file) => file.relativePath);
    expect(relatives).toEqual(["src/a.ts", "src/b.js", "src/nested/c.ts"]);
  });

  it("includes Python only when it is an active language", async () => {
    const result = await discoverFiles(dir, {
      cwd: dir,
      languages: ["typescript", "javascript", "python"],
      ignore: [],
    });
    const relatives = result._unsafeUnwrap().map((file) => file.relativePath);
    expect(relatives).toContain("src/skip.py");
  });

  it("prunes an entire directory matched by an ignore glob", async () => {
    const result = await discoverFiles(dir, {
      cwd: dir,
      languages: ["typescript", "javascript"],
      ignore: ["src/nested/**"],
    });
    const relatives = result._unsafeUnwrap().map((file) => file.relativePath);
    expect(relatives).not.toContain("src/nested/c.ts");
    expect(relatives).toContain("src/a.ts");
  });

  it("returns a single file when pointed at one", async () => {
    const result = await discoverFiles(path.join(dir, "src/a.ts"), {
      cwd: dir,
      languages: ["typescript"],
      ignore: [],
    });
    const files = result._unsafeUnwrap();
    expect(files).toHaveLength(1);
    expect(files[0]?.relativePath).toBe("src/a.ts");
    expect(files[0]?.language).toBe("typescript");
  });

  it("errors on an unscannable single file", async () => {
    const result = await discoverFiles(path.join(dir, "notes.md"), {
      cwd: dir,
      languages: ["typescript", "javascript"],
      ignore: [],
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toContain("not a scannable source file");
  });

  it("errors on a missing path", async () => {
    const result = await discoverFiles(path.join(dir, "does-not-exist"), {
      cwd: dir,
      languages: ["typescript"],
      ignore: [],
    });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toContain("path not found");
  });
});
