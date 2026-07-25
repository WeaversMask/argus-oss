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
});
