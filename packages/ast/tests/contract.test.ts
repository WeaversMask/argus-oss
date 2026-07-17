import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LANGUAGES, ParseError } from "@argus/core";
import type { AstParserPort, Language } from "@argus/core";
import { TreeSitterAstParser } from "../src/index.js";
import { TS_FIXTURE, collectNodes, parseOk, sharedParser, someFile } from "./helpers.js";

/**
 * Contract tests: the wrapper conforms to `AstParserPort` as documented on
 * the port (P1-03 acceptance criterion). Coordinate conversion has its own
 * suite in conversion.test.ts.
 */
describe("TreeSitterAstParser: AstParserPort conformance", () => {
  it("is assignable to the port and lists core's languages, frozen", () => {
    const port: AstParserPort = sharedParser;
    expect(port.languages).toEqual([...LANGUAGES]);
    expect(Object.isFrozen(port.languages)).toBe(true);
  });

  it("returns err(ParseError) for an unsupported language instead of throwing", async () => {
    const file = someFile("tests/unsupported.rb");
    const result = await sharedParser.parse(file, "puts 1", "ruby" as Language);
    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(ParseError);
    expect(error.file).toBe(file);
    expect(error.message).toContain('unsupported language "ruby"');
    expect(error.message).toContain("typescript, javascript, python");
  });

  it("is pure with respect to inputs: same input yields an equivalent tree", async () => {
    const first = await parseOk(TS_FIXTURE);
    const second = await parseOk(TS_FIXTURE);
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });

  it("parses syntactically invalid source into a best-effort tree, not an error", async () => {
    const result = await sharedParser.parse(someFile(), "let x = ;", "typescript");
    const parsed = result._unsafeUnwrap();
    const nodeTypes = collectNodes(parsed.root).map((node) => node.nodeType);
    expect(nodeTypes).toContain("ERROR");
  });

  it("still returns a tree for input that is nothing but errors", async () => {
    const result = await sharedParser.parse(someFile(), "@@ ~~ @@", "typescript");
    expect(result.isOk()).toBe(true);
  });

  it("returns err(ParseError) when the grammar wasm file is missing", async () => {
    const parser = new TreeSitterAstParser({
      grammarPaths: { typescript: "/nonexistent/tree-sitter-typescript.wasm" },
    });
    const result = await parser.parse(someFile(), "let x = 1;", "typescript");
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(ParseError);
    expect(error.message).toContain("ENOENT");
  });

  it("returns err(ParseError) when the grammar file is not a wasm module", async () => {
    const notWasm = fileURLToPath(new URL("../package.json", import.meta.url));
    const parser = new TreeSitterAstParser({ grammarPaths: { typescript: notWasm } });
    const result = await parser.parse(someFile(), "let x = 1;", "typescript");
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ParseError);
  });

  it("does not poison the grammar cache with a failed load (retries, same error)", async () => {
    const parser = new TreeSitterAstParser({
      grammarPaths: { typescript: "/nonexistent/tree-sitter-typescript.wasm" },
    });
    const first = await parser.parse(someFile(), "let x = 1;", "typescript");
    const second = await parser.parse(someFile(), "let x = 1;", "typescript");
    expect(first.isErr()).toBe(true);
    expect(second.isErr()).toBe(true);
  });

  it("an override for one language does not affect the others", async () => {
    const parser = new TreeSitterAstParser({
      grammarPaths: { typescript: "/nonexistent/tree-sitter-typescript.wasm" },
    });
    const result = await parser.parse(someFile("tests/ok.py"), "x = 1", "python");
    expect(result.isOk()).toBe(true);
  });

  it("returns deeply frozen data: file, nodes, children arrays, positions", async () => {
    const parsed = await parseOk(TS_FIXTURE);
    expect(Object.isFrozen(parsed)).toBe(true);
    for (const node of collectNodes(parsed.root)) {
      expect(Object.isFrozen(node)).toBe(true);
      expect(Object.isFrozen(node.children)).toBe(true);
      expect(Object.isFrozen(node.position)).toBe(true);
    }
  });

  it("dispose() frees cached engine objects and the parser stays usable", async () => {
    const parser = new TreeSitterAstParser();
    (await parser.parse(someFile(), "let a = 1;", "typescript"))._unsafeUnwrap();
    parser.dispose();
    const again = await parser.parse(someFile(), "let b = 2;", "typescript");
    expect(again.isOk()).toBe(true);
  });

  it("dispose() is idempotent and safe before first use", () => {
    const parser = new TreeSitterAstParser();
    parser.dispose();
    parser.dispose();
  });

  it("threads file and language through to the ParsedFile", async () => {
    const file = someFile("src/deep/nested.ts");
    const result = await sharedParser.parse(file, "const a = 1;", "typescript");
    const parsed = result._unsafeUnwrap();
    expect(parsed.file).toBe(file);
    expect(parsed.language).toBe("typescript");
  });
});
