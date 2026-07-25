import { describe, expect, it } from "vitest";
import { TreeSitterAstParser, visit } from "@argus/ast";
import { filePath } from "@argus/core";
import { LineIndex } from "../src/position-offset.js";

describe("LineIndex", () => {
  it("maps line 1 column 1 to offset 0", () => {
    const index = new LineIndex("abc");
    expect(index.offsetOf(1, 1)).toBe(0);
  });

  it("maps a later column on line 1 to the matching offset", () => {
    const index = new LineIndex("abcdef");
    expect(index.offsetOf(1, 4)).toBe(3);
  });

  it("maps the start of a later line past every preceding newline", () => {
    const index = new LineIndex("aa\nbb\ncc");
    expect(index.offsetOf(2, 1)).toBe(3);
    expect(index.offsetOf(3, 1)).toBe(6);
  });

  it("counts a CRLF line ending's \\r as part of the preceding line, not stripped", () => {
    // "aa\r\nbb": line 1 is "aa\r" (3 chars incl. \r), line 2 starts right after \n at offset 4.
    const index = new LineIndex("aa\r\nbb");
    expect(index.offsetOf(1, 3)).toBe(2); // the \r itself
    expect(index.offsetOf(2, 1)).toBe(4);
  });

  it("offsetsOf returns the [start, end) pair for a position", () => {
    const index = new LineIndex("aa\nbbbb\ncc");
    const [start, end] = index.offsetsOf({
      file: filePath("f.ts")._unsafeUnwrap(),
      startLine: 2,
      startColumn: 1,
      endLine: 2,
      endColumn: 5,
    });
    expect(start).toBe(3);
    expect(end).toBe(7);
  });

  it("throws for a line beyond the source's line count", () => {
    const index = new LineIndex("a\nb");
    expect(() => index.offsetOf(5, 1)).toThrow(/out of range/);
  });

  it("round-trips against every node of a real parsed tree: source.slice(offsets) === node.text", async () => {
    const parser = new TreeSitterAstParser();
    const source = [
      'import { a } from "./a";',
      "",
      "function greet(name: string): string {",
      "  if (name.length > 0) {",
      "    return `hi ${name}`;",
      "  }",
      '  return "hi";',
      "}",
      "",
    ].join("\n");
    const file = filePath("src/example.ts")._unsafeUnwrap();
    const parsed = (await parser.parse(file, source, "typescript"))._unsafeUnwrap();
    const index = new LineIndex(source);

    let checked = 0;
    visit(parsed.root, {
      enter: (node) => {
        const [start, end] = index.offsetsOf(node.position);
        expect(source.slice(start, end)).toBe(node.text);
        checked += 1;
      },
    });
    expect(checked).toBeGreaterThan(10);
  });
});
