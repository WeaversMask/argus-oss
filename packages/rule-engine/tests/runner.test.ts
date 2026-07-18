import { describe, expect, it } from "vitest";
import { RuleExecutionError, violationId } from "@argus/core";
import type { Violation } from "@argus/core";
import { FakeRuleRunner } from "@argus/testing";
import { Engine, Runner } from "../src/index.js";
import type { RuleContext } from "../src/index.js";
import { activationOf, inputOf, makeNode, moduleOf, rid, someFile } from "./helpers.js";

function reportingEngine(): Engine {
  const engine = new Engine();
  engine
    .register(
      moduleOf("flag-identifiers", (context: RuleContext) => ({
        identifier: (node) => {
          context.report({ message: `flagged ${node.text}`, position: node.position });
        },
      })),
    )
    ._unsafeUnwrap();
  engine
    .register(
      moduleOf("explode-on-command", {
        detonator: () => {
          throw new Error("bad file");
        },
      }),
    )
    ._unsafeUnwrap();
  return engine;
}

function fileTree(file: string, nodeTypes: readonly string[]): ReturnType<typeof makeNode> {
  return makeNode({
    nodeType: "program",
    file: someFile(file),
    children: nodeTypes.map((nodeType, index) =>
      makeNode({ nodeType, file: someFile(file), startLine: index + 2, text: nodeType }),
    ),
  });
}

const ACTIVATIONS = [activationOf("flag-identifiers"), activationOf("explode-on-command")];

describe("Runner", () => {
  it("aggregates violations across files in input order", async () => {
    const runner = new Runner(reportingEngine());
    const first = someFile("src/b.ts");
    const second = someFile("src/a.ts");

    const summary = await runner.runAll([
      inputOf(fileTree("src/b.ts", ["identifier", "identifier"]), ACTIVATIONS, { file: first }),
      inputOf(fileTree("src/a.ts", ["identifier"]), ACTIVATIONS, { file: second }),
    ]);

    expect(summary.failures).toEqual([]);
    // Input order wins, not path order: b.ts's violations come first.
    expect(summary.violations.map((found) => found.position.file)).toEqual([first, first, second]);
  });

  it("skips-and-collects failed files while the rest of the scan completes", async () => {
    const runner = new Runner(reportingEngine());
    const summary = await runner.runAll([
      inputOf(fileTree("src/ok.ts", ["identifier"]), ACTIVATIONS, { file: someFile("src/ok.ts") }),
      inputOf(fileTree("src/bad.ts", ["detonator"]), ACTIVATIONS, {
        file: someFile("src/bad.ts"),
      }),
      inputOf(fileTree("src/late.ts", ["identifier"]), ACTIVATIONS, {
        file: someFile("src/late.ts"),
      }),
    ]);

    expect(summary.violations.map((found) => found.position.file)).toEqual([
      someFile("src/ok.ts"),
      someFile("src/late.ts"),
    ]);
    expect(summary.failures).toHaveLength(1);
    expect(summary.failures[0]!.file).toBe(someFile("src/bad.ts"));
    expect(summary.failures[0]!.error.ruleId).toBe("explode-on-command");
  });

  it("returns a frozen summary with frozen collections", async () => {
    const runner = new Runner(reportingEngine());

    const summary = await runner.runAll([
      inputOf(fileTree("src/bad.ts", ["detonator"]), ACTIVATIONS, { file: someFile("src/bad.ts") }),
    ]);

    expect(Object.isFrozen(summary)).toBe(true);
    expect(Object.isFrozen(summary.violations)).toBe(true);
    expect(Object.isFrozen(summary.failures)).toBe(true);
    expect(Object.isFrozen(summary.failures[0])).toBe(true);
  });

  it("returns an empty summary for an empty scan", async () => {
    const summary = await new Runner(new Engine()).runAll([]);

    expect(summary.violations).toEqual([]);
    expect(summary.failures).toEqual([]);
  });

  it("composes any RuleRunnerPort, not just the Engine", async () => {
    const fake = new FakeRuleRunner();
    const canned: Violation = Object.freeze({
      id: violationId("fake-1")._unsafeUnwrap(),
      ruleId: rid("canned-rule"),
      severity: "error",
      message: "canned violation",
      position: Object.freeze({
        file: someFile("src/fake.ts"),
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 2,
      }),
    });
    fake.respondWith([canned]);
    const runner = new Runner(fake);
    const input = inputOf(fileTree("src/fake.ts", []), [], { file: someFile("src/fake.ts") });

    const summary = await runner.runAll([input]);
    expect(summary.violations).toEqual([canned]);

    fake.failNextWith(new RuleExecutionError("port-level failure"));
    const failed = await runner.runAll([input]);
    expect(failed.failures[0]!.error.message).toContain("port-level failure");
    expect(fake.runs).toHaveLength(2);
  });
});
