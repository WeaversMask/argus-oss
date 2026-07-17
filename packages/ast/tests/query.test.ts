import { describe, expect, it } from "vitest";
import { DomainError } from "@argus/core";
import type { AstNode } from "@argus/core";
import type { AstDocument } from "../src/index.js";
import { QueryError, visit } from "../src/index.js";
import { JS_FIXTURE, sharedParser, someFile } from "./helpers.js";

async function documentOf(
  source: string,
  language: "typescript" | "javascript" = "javascript",
): Promise<AstDocument> {
  const result = await sharedParser.parseDocument(someFile(), source, language);
  return result._unsafeUnwrap();
}

describe("AstDocument.query", () => {
  it("returns matches whose captured nodes are the identical converted instances", async () => {
    const doc = await documentOf(JS_FIXTURE);
    try {
      const matches = doc.query("(function_declaration name: (identifier) @fn)")._unsafeUnwrap();
      expect(matches).toHaveLength(1);
      const captured = matches[0]!.captures[0]!;
      expect(captured.name).toBe("fn");
      expect(captured.node.text).toBe("fetchAll");
      let viaVisit: AstNode | undefined;
      visit(doc.root, {
        enter: (node) => {
          if (node.nodeType === "identifier" && node.text === "fetchAll") {
            viaVisit = node;
            return "stop";
          }
          return undefined;
        },
      });
      expect(viaVisit).toBeDefined();
      expect(Object.is(captured.node, viaVisit)).toBe(true);
    } finally {
      doc.dispose();
    }
  });

  it("distinguishes patterns by patternIndex", async () => {
    const doc = await documentOf(JS_FIXTURE);
    try {
      const matches = doc
        .query(
          "(class_declaration name: (identifier) @cls) (function_declaration name: (identifier) @fn)",
        )
        ._unsafeUnwrap();
      const byPattern = new Map(matches.map((m) => [m.patternIndex, m.captures[0]]));
      expect(byPattern.get(0)?.name).toBe("cls");
      expect(byPattern.get(0)?.node.text).toBe("Registry");
      expect(byPattern.get(1)?.name).toBe("fn");
      expect(byPattern.get(1)?.node.text).toBe("fetchAll");
    } finally {
      doc.dispose();
    }
  });

  it("returns ok([]) when nothing matches", async () => {
    const doc = await documentOf("const a = 1;");
    try {
      const matches = doc.query("(function_declaration) @fn")._unsafeUnwrap();
      expect(matches).toEqual([]);
    } finally {
      doc.dispose();
    }
  });

  it("returns frozen results", async () => {
    const doc = await documentOf(JS_FIXTURE);
    try {
      const matches = doc.query("(function_declaration) @fn")._unsafeUnwrap();
      expect(Object.isFrozen(matches)).toBe(true);
      expect(Object.isFrozen(matches[0])).toBe(true);
      expect(Object.isFrozen(matches[0]!.captures)).toBe(true);
      expect(Object.isFrozen(matches[0]!.captures[0])).toBe(true);
    } finally {
      doc.dispose();
    }
  });

  it("returns err(QueryError) for malformed query source instead of throwing", async () => {
    const doc = await documentOf("const a = 1;");
    try {
      const result = doc.query("(function_declaration");
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(QueryError);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe("ast/query");
    } finally {
      doc.dispose();
    }
  });

  it("returns err(QueryError) for a capture on a node type the grammar lacks", async () => {
    const doc = await documentOf("const a = 1;");
    try {
      expect(doc.query("(no_such_node_kind) @x").isErr()).toBe(true);
    } finally {
      doc.dispose();
    }
  });

  it("returns err(QueryError) after dispose; parsed data stays valid", async () => {
    const doc = await documentOf(JS_FIXTURE);
    doc.dispose();
    doc.dispose(); // idempotent
    const result = doc.query("(function_declaration) @fn");
    expect(result._unsafeUnwrapErr().message).toContain("disposed");
    expect(doc.root.text).toBe(JS_FIXTURE);
    expect(doc.parsed.root).toBe(doc.root);
  });
});
