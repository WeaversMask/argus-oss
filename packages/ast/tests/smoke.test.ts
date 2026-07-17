import { describe, expect, it } from "vitest";
import { JS_FIXTURE, PY_FIXTURE, TS_FIXTURE, collectNodes, parseOk } from "./helpers.js";

/**
 * Per-language parse smoke tests (phase note): a grammar bump that changes
 * root vocabulary, drops constructs, or starts erroring on idiomatic code
 * fails here on the next dependency update.
 */
describe.each([
  {
    language: "typescript" as const,
    fixture: TS_FIXTURE,
    rootType: "program",
    constructs: ["interface_declaration", "function_declaration", "class_declaration"],
  },
  {
    language: "javascript" as const,
    fixture: JS_FIXTURE,
    rootType: "program",
    constructs: ["function_declaration", "class_declaration", "export_statement"],
  },
  {
    language: "python" as const,
    fixture: PY_FIXTURE,
    rootType: "module",
    constructs: ["class_definition", "function_definition", "decorated_definition"],
  },
])("smoke: $language", ({ language, fixture, rootType, constructs }) => {
  it("parses an idiomatic file cleanly", async () => {
    const parsed = await parseOk(fixture, language);
    expect(parsed.language).toBe(language);
    expect(parsed.root.nodeType).toBe(rootType);
    const nodeTypes = new Set(collectNodes(parsed.root).map((node) => node.nodeType));
    expect(nodeTypes.has("ERROR")).toBe(false);
    for (const construct of constructs) {
      expect(nodeTypes.has(construct), `expected a ${construct} node`).toBe(true);
    }
  });
});
