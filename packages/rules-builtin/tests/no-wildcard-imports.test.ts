import { describe, expect, it } from "vitest";
import { noWildcardImports } from "../src/style/no-wildcard-imports.js";
import { fixtureSuite } from "./fixture-suite.js";
import { runRule } from "./harness.js";

fixtureSuite(noWildcardImports, "style/no-wildcard-imports");

describe("no-wildcard-imports specifics", () => {
  it("reports once per wildcard import", async () => {
    const violations = await runRule(
      noWildcardImports,
      `import * as a from "./a";\nimport * as b from "./b";\n`,
    );
    expect(violations).toHaveLength(2);
    expect(violations[0]?.message).toContain("import * as");
  });

  it("does not flag `export * from` re-exports", async () => {
    const violations = await runRule(noWildcardImports, `export * from "./m";\n`);
    expect(violations).toEqual([]);
  });

  it("points at the namespace clause on the import's line", async () => {
    const violations = await runRule(noWildcardImports, `import * as ns from "./m";\n`);
    expect(violations[0]?.position.startLine).toBe(1);
  });
});
