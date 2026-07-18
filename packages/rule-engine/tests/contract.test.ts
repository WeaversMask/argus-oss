import { describe, expect, it } from "vitest";
import type { AstNode, RuleRunnerPort } from "@argus/core";
import { Engine } from "../src/index.js";
import type { RuleContext } from "../src/index.js";
import { DEFAULT_FILE, activationOf, inputOf, makeNode, moduleOf } from "./helpers.js";

/**
 * `RuleRunnerPort` conformance (P1-02 contract): never throws, source
 * order with ties by rule id, deterministic, no input mutation, and —
 * the hot-path clause — one walk per file regardless of rule count.
 * Dispatch semantics live in engine.test.ts; this suite pins the port's
 * own wording.
 */
describe("RuleRunnerPort conformance", () => {
  it("Engine satisfies the port type", () => {
    const port: RuleRunnerPort = new Engine();
    expect(typeof port.run).toBe("function");
  });

  it("walks the AST once per file, not once per rule", async () => {
    // Each node counts reads of its `children`. The walk reads a node's
    // children N+1 times (N children plus the end-of-list probe), and a
    // per-rule walk would multiply that by the number of active rules.
    const reads = new Map<string, number>();
    function countingNode(name: string, children: readonly AstNode[]): AstNode {
      return Object.freeze({
        nodeType: "counted",
        position: Object.freeze({
          file: DEFAULT_FILE,
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 2,
        }),
        text: name,
        get children(): readonly AstNode[] {
          reads.set(name, (reads.get(name) ?? 0) + 1);
          return children;
        },
      });
    }
    const root = countingNode("root", [countingNode("a", []), countingNode("b", [])]);

    const engine = new Engine();
    const activations = ["rule-one", "rule-two", "rule-three"].map((id) => {
      engine
        .register(
          moduleOf(id, {
            "*": () => {
              /* no-op */
            },
          }),
        )
        ._unsafeUnwrap();
      return activationOf(id);
    });

    (await engine.run(inputOf(root, activations)))._unsafeUnwrap();

    expect(reads.get("root")).toBe(3); // 2 children + end probe
    expect(reads.get("a")).toBe(1);
    expect(reads.get("b")).toBe(1);
  });

  it("resolves (never rejects, never throws) when rules misbehave", async () => {
    const engine = new Engine();
    engine
      .register(
        moduleOf("thrower", {
          "*": () => {
            throw new Error("kaboom");
          },
        }),
      )
      ._unsafeUnwrap();

    // A rejected promise or a synchronous throw would fail the test itself.
    const result = await engine.run(
      inputOf(makeNode({ nodeType: "program" }), [activationOf("thrower")]),
    );

    expect(result.isErr()).toBe(true);
  });

  it("returns equal results for repeated runs of the same input", async () => {
    const engine = new Engine();
    engine
      .register(
        moduleOf("stable", (context: RuleContext) => ({
          "*": (node) => {
            context.report({ message: `node ${node.nodeType}`, position: node.position });
          },
        })),
      )
      ._unsafeUnwrap();
    const input = inputOf(
      makeNode({
        nodeType: "program",
        children: [makeNode({ nodeType: "identifier", startLine: 2 })],
      }),
      [activationOf("stable")],
    );

    expect((await engine.run(input))._unsafeUnwrap()).toEqual(
      (await engine.run(input))._unsafeUnwrap(),
    );
  });
});
