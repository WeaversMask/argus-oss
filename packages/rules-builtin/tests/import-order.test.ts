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
