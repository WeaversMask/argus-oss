import { describe, expect, it } from "vitest";
import { position } from "@argus/core";
import type { AstNode } from "@argus/core";
import { JS_FIXTURE, PY_FIXTURE, TS_FIXTURE, collectNodes, parseOk } from "./helpers.js";

function child(node: AstNode, index: number): AstNode {
  const c = node.children[index];
  expect(c).toBeDefined();
  return c as AstNode;
}

/**
 * The +1 conversion contract (ADR-0004 residual risk): tree-sitter is
 * 0-based end-exclusive, the domain is 1-based end-exclusive — a uniform
 * `+1` on all four numbers. In-range off-by-ones pass `position()`
 * validation, so only these known-coordinate assertions catch them.
 */
describe("coordinate conversion: uniform +1 on all four numbers", () => {
  it("converts a second-line statement (tree-sitter (1,0)-(1,10) → (2,1)-(2,11))", async () => {
    const parsed = await parseOk("let x = 1;\nlet y = 2;\n");
    const second = child(parsed.root, 1);
    expect(second.nodeType).toBe("lexical_declaration");
    expect(second.position).toMatchObject({
      startLine: 2,
      startColumn: 1,
      endLine: 2,
      endColumn: 11,
    });
  });

  it("converts an inner identifier (tree-sitter (1,4)-(1,5) → (2,5)-(2,6))", async () => {
    const parsed = await parseOk("let x = 1;\nlet y = 2;\n");
    const declarator = child(child(parsed.root, 1), 1);
    expect(declarator.nodeType).toBe("variable_declarator");
    const name = child(declarator, 0);
    expect(name.nodeType).toBe("identifier");
    expect(name.text).toBe("y");
    expect(name.position).toMatchObject({
      startLine: 2,
      startColumn: 5,
      endLine: 2,
      endColumn: 6,
    });
  });

  it("converts the root of a trailing-newline file (tree-sitter (0,0)-(2,0) → (1,1)-(3,1))", async () => {
    const parsed = await parseOk("let x = 1;\nlet y = 2;\n");
    expect(parsed.root.position).toMatchObject({
      startLine: 1,
      startColumn: 1,
      endLine: 3,
      endColumn: 1,
    });
  });

  it("converts multi-line node ends (function body closing brace)", async () => {
    const source = "function f() {\n  return 1;\n}\n";
    const parsed = await parseOk(source);
    const fn = child(parsed.root, 0);
    expect(fn.nodeType).toBe("function_declaration");
    // 0-based end (2,1) — just past "}" on the third line.
    expect(fn.position).toMatchObject({ startLine: 1, startColumn: 1, endLine: 3, endColumn: 2 });
  });

  it("represents an empty file as the zero-width point (1,1)", async () => {
    const parsed = await parseOk("");
    expect(parsed.root.children).toHaveLength(0);
    expect(parsed.root.text).toBe("");
    expect(parsed.root.position).toMatchObject({
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 1,
    });
  });

  it("produces positions core's position() factory accepts, for every node in all three languages", async () => {
    for (const [source, language] of [
      [TS_FIXTURE, "typescript"],
      [JS_FIXTURE, "javascript"],
      [PY_FIXTURE, "python"],
    ] as const) {
      const parsed = await parseOk(source, language);
      const nodes = collectNodes(parsed.root);
      expect(nodes.length).toBeGreaterThan(20);
      for (const node of nodes) {
        const validated = position(node.position);
        expect(validated.isOk()).toBe(true);
        expect(validated._unsafeUnwrap()).toEqual(node.position);
      }
    }
  });

  it("threads the file into every node's position", async () => {
    const parsed = await parseOk("const a = 1;");
    for (const node of collectNodes(parsed.root)) {
      expect(node.position.file).toBe(parsed.file);
    }
  });
});

describe("column and index units are UTF-16 code units (LSP default)", () => {
  it("counts an astral-plane emoji as two column units", async () => {
    const source = 'const a = "🎉"; const b = 2;';
    const parsed = await parseOk(source);
    const bDeclaration = child(parsed.root, 1);
    // Self-verifying against JS string indexing: 1-based column of a
    // single-line offset is index + 1 exactly when both count UTF-16 units.
    expect(bDeclaration.position.startColumn).toBe(source.indexOf("const b") + 1);
    const aString = child(child(child(parsed.root, 0), 1), 2);
    expect(aString.nodeType).toBe("string");
    expect(aString.text).toBe('"🎉"');
  });
});

describe("text", () => {
  it("returns the exact source slice, with the root covering the whole file", async () => {
    const parsed = await parseOk(TS_FIXTURE);
    expect(parsed.root.text).toBe(TS_FIXTURE);
    const fn = child(parsed.root, 1);
    expect(fn.text).toBe(fn.text); // memoized second read
    expect(TS_FIXTURE.includes(fn.text)).toBe(true);
  });
});

describe("fieldName", () => {
  it("labels grammar fields and omits the key everywhere else", async () => {
    const parsed = await parseOk("function add(a, b) { return a + b; }");
    const exportOrFn = child(parsed.root, 0);
    expect(exportOrFn.nodeType).toBe("function_declaration");
    const byField = new Map(
      exportOrFn.children.filter((c) => c.fieldName !== undefined).map((c) => [c.fieldName, c]),
    );
    expect(byField.get("name")?.text).toBe("add");
    expect(byField.get("parameters")?.nodeType).toBe("formal_parameters");
    expect(byField.get("body")?.nodeType).toBe("statement_block");
    // The "function" keyword is an unlabelled anonymous child: no key at all.
    const keyword = exportOrFn.children.find((c) => c.nodeType === "function");
    expect(keyword).toBeDefined();
    expect(keyword !== undefined && "fieldName" in keyword).toBe(false);
    expect("fieldName" in parsed.root).toBe(false);
  });
});

describe("children fidelity", () => {
  it("keeps anonymous nodes (keywords) and extras (comments) in source order", async () => {
    const parsed = await parseOk("// note\nlet a = 1;");
    expect(child(parsed.root, 0).nodeType).toBe("comment");
    const declaration = child(parsed.root, 1);
    expect(child(declaration, 0).nodeType).toBe("let");
    expect(child(declaration, 0).text).toBe("let");
  });
});
