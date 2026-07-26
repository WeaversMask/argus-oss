import { describe, expect, it } from "vitest";
import { importOrder } from "../src/style/import-order.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule } from "./harness.js";

fixtureSuite(importOrder, "style/import-order");

describe("import-order specifics", () => {
  it("accepts the canonical builtin → external → relative order", async () => {
    const source = `import { readFile } from "node:fs";\nimport react from "react";\nimport { local } from "./local";\n`;
    expect(await runRule(importOrder, source)).toEqual([]);
  });

  it("flags a builtin import placed after a relative one", async () => {
    const source = `import { local } from "./local";\nimport { readFile } from "node:fs";\n`;
    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toMatch(/node builtins.*before.*relative/);
  });

  it("ignores `export … from` re-exports", async () => {
    const source = `import react from "react";\nexport * from "./local";\n`;
    expect(await runRule(importOrder, source)).toEqual([]);
  });

  it("treats a bare specifier as an external package", async () => {
    const source = `import lodash from "lodash";\nimport { join } from "node:path";\n`;
    expect(await runRule(importOrder, source)).toHaveLength(1);
  });

  it("classifies an unprefixed builtin submodule (fs/promises) as a builtin", async () => {
    const source = `import react from "react";\nimport { readFile } from "fs/promises";\n`;
    expect(await runRule(importOrder, source)).toHaveLength(1);
    // A scoped/submodule external is still external:
    const ok = `import x from "@scope/pkg/sub";\nimport { a } from "./local";\n`;
    expect(await runRule(importOrder, ok)).toEqual([]);
  });
});

describe("import-order fix", () => {
  it("offers a whole-block reorder fix for a contiguous, one-per-line block", async () => {
    const relative = 'import { local } from "./local";';
    const builtin = 'import { readFile } from "node:fs";';
    const source = `${relative}\n${builtin}\n`;

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.fix).toEqual({
      position: {
        file: "src/fixture.ts",
        startLine: 1,
        startColumn: 1,
        endLine: 2,
        endColumn: builtin.length + 1,
      },
      replacement: `${builtin}\n${relative}`,
    });
  });

  it("preserves a blank-line gap between reordered imports", async () => {
    const relative = 'import { local } from "./local";';
    const builtin = 'import { readFile } from "node:fs";';
    const source = `${relative}\n\n${builtin}\n`;

    const violations = await runRule(importOrder, source);
    expect(violations[0]?.fix?.replacement).toBe(`${builtin}\n\n${relative}`);
  });

  it("attaches the same fix to every violation the reorder would resolve", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("fixtures/style/import-order/invalid/all-reversed.ts", import.meta.url),
        "utf8",
      ),
    );

    const violations = await runRule(importOrder, source);
    expect(violations.length).toBeGreaterThanOrEqual(2);
    for (const v of violations) {
      expect(v.fix).toEqual(violations[0]?.fix);
    }
  });

  it("declines to fix when a comment sits between two imports (never misplace it)", async () => {
    const source =
      'import { local } from "./local";\n// keep me here\nimport { readFile } from "node:fs";\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect("fix" in violations[0]!).toBe(false);
  });

  it("declines to fix when two imports share a line (gap not reconstructible)", async () => {
    const source = 'import { local } from "./local"; import { readFile } from "node:fs";\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect("fix" in violations[0]!).toBe(false);
  });

  it("declines to fix when a non-import statement interrupts the block", async () => {
    const source =
      'import { local } from "./local";\nconst mid = 1;\nimport { readFile } from "node:fs";\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect("fix" in violations[0]!).toBe(false);
  });

  it("declines when a trailing comment sits on the last import's own line", async () => {
    // Review #39 HIGH-3: this comment is OUTSIDE the [first, last] contiguity
    // window, so contiguity alone would let the block reorder out from under
    // it, silently reattaching it to a different import.
    const source =
      'import { local } from "./local";\nimport { readFile } from "node:fs"; // keep this next to fs!\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect("fix" in violations[0]!).toBe(false);
  });

  it("declines when a leading comment sits on the first import's own line", async () => {
    const source =
      '/* about local */ import { local } from "./local";\nimport { readFile } from "node:fs";\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect("fix" in violations[0]!).toBe(false);
  });

  it("declines when a comment sits on the line directly above the block", async () => {
    // Follow-up review: the earlier guard stopped at the import's OWN line, so
    // this case still reordered. A comment one line up is where every
    // line-scoped directive lives, and it binds to the next line by definition.
    const source =
      '// module docs\nimport { local } from "./local";\nimport { readFile } from "node:fs";\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect("fix" in violations[0]!).toBe(false);
  });

  it("declines when a directive comment binds to the block's first import", async () => {
    // `@ts-expect-error` reattaching is a compile break in both directions:
    // TS2578 on the import that never needed it, and the original error
    // resurfacing on the one that did.
    const source =
      '// @ts-expect-error untyped\nimport legacy from "./legacy";\nimport { readFile } from "node:fs";\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect("fix" in violations[0]!).toBe(false);
  });

  it("declines when a comment sits on the line directly below the block", async () => {
    const source =
      'import { local } from "./local";\nimport { readFile } from "node:fs";\n// ^ readFile must stay last\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect("fix" in violations[0]!).toBe(false);
  });

  it("still fixes when a blank line separates a comment from the block", async () => {
    // A blank line is the signal that the comment is free-floating rather than
    // attached — a file header keeps its fix, a flush directive does not.
    const source =
      '// module docs\n\nimport { local } from "./local";\nimport { readFile } from "node:fs";\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.fix).toBeDefined();
  });

  it("declines when any import is side-effect-only (evaluation order is load-bearing)", async () => {
    // Review #39 MEDIUM-1: `import "./setup"` exists precisely to run at that
    // point relative to the others; moving it across a group boundary is the
    // change that breaks it.
    const source = 'import "./setup-globals";\nimport express from "express";\n';

    const violations = await runRule(importOrder, source);
    expect(violations).toHaveLength(1);
    expect("fix" in violations[0]!).toBe(false);
  });
});
