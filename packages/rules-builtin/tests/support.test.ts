import { describe, expect, it } from "vitest";
import { defineRule, lineCount, listenTo } from "../src/support.js";

describe("support helpers", () => {
  it("defineRule carries an optional docsUrl through to the rule", () => {
    const withUrl = defineRule(
      {
        id: "quality/example",
        name: "example",
        description: "An example rule.",
        defaultSeverity: "info",
        docsUrl: "https://argus.example/rules/example",
      },
      () => ({}),
    );
    expect(withUrl.rule.docsUrl).toBe("https://argus.example/rules/example");

    const withoutUrl = defineRule(
      {
        id: "quality/example",
        name: "example",
        description: "An example rule.",
        defaultSeverity: "info",
      },
      () => ({}),
    );
    expect(withoutUrl.rule.docsUrl).toBeUndefined();
  });

  it("listenTo maps one listener across every given node type", () => {
    const listeners = listenTo(["a", "b", "c"], () => undefined);
    expect(Object.keys(listeners).sort()).toEqual(["a", "b", "c"]);
  });

  it("lineCount ignores a single trailing newline", () => {
    expect(lineCount("a")).toBe(1);
    expect(lineCount("a\nb")).toBe(2);
    expect(lineCount("a\nb\n")).toBe(2);
    expect(lineCount("a\nb\n\n")).toBe(3);
  });
});
