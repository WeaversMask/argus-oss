import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FormatError, filePath } from "@argus/core";
import type { FormatterPort } from "@argus/core";
import { PrettierFormatter } from "../src/index.js";

/** Creates a throwaway temp directory; returns it plus a cleanup function. */
function tempDir(): { readonly dir: string; cleanup: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), "argus-adapters-prettier-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
});

function projectAt(files: Readonly<Record<string, string>>): string {
  const { dir, cleanup } = tempDir();
  cleanups.push(cleanup);
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), contents, "utf8");
  }
  return dir;
}

/**
 * Contract tests: `PrettierFormatter` conforms to `FormatterPort` as
 * documented on the port (never throws, pure w.r.t. inputs, idempotent).
 */
describe("PrettierFormatter: FormatterPort conformance", () => {
  it("is assignable to the port", () => {
    const port: FormatterPort = new PrettierFormatter(projectAt({}));
    expect(port).toBeInstanceOf(PrettierFormatter);
  });

  it("formats messy source using Prettier's own defaults when no config exists", async () => {
    const root = projectAt({});
    const formatter = new PrettierFormatter(root);
    const result = await formatter.format(
      `const   x=1\nconst y = 'hi'\n`,
      filePath("src/example.ts")._unsafeUnwrap(),
    );
    expect(result._unsafeUnwrap()).toBe('const x = 1;\nconst y = "hi";\n');
  });

  it("resolves the target project's own .prettierrc, not this repo's", async () => {
    const root = projectAt({
      ".prettierrc.json": JSON.stringify({ singleQuote: true, semi: false }),
    });
    const formatter = new PrettierFormatter(root);
    const result = await formatter.format(
      `const y = "hi"\n`,
      filePath("src/example.ts")._unsafeUnwrap(),
    );
    expect(result._unsafeUnwrap()).toBe("const y = 'hi'\n");
  });

  it("is idempotent: formatting already-formatted text returns it unchanged", async () => {
    const formatter = new PrettierFormatter(projectAt({}));
    const file = filePath("src/example.ts")._unsafeUnwrap();
    const once = (await formatter.format('const x = "hi";\n', file))._unsafeUnwrap();
    const twice = (await formatter.format(once, file))._unsafeUnwrap();
    expect(twice).toBe(once);
  });

  it("is pure with respect to inputs: same input yields the same output", async () => {
    const formatter = new PrettierFormatter(projectAt({}));
    const file = filePath("src/example.ts")._unsafeUnwrap();
    const source = "const   x =1\n";
    const first = await formatter.format(source, file);
    const second = await formatter.format(source, file);
    expect(second._unsafeUnwrap()).toBe(first._unsafeUnwrap());
  });

  it("returns err(FormatError) for unparseable source instead of throwing", async () => {
    const formatter = new PrettierFormatter(projectAt({}));
    const file = filePath("src/broken.ts")._unsafeUnwrap();
    const result = await formatter.format("const x = ;", file);
    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(FormatError);
    expect(error.file).toBe(file);
  });
});
