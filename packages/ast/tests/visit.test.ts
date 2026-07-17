import { describe, expect, it } from "vitest";
import { position } from "@argus/core";
import type { AstNode } from "@argus/core";
import { visit } from "../src/index.js";
import { TS_FIXTURE, collectNodes, parseOk, someFile } from "./helpers.js";

const somePosition = position({
  file: someFile(),
  startLine: 1,
  startColumn: 1,
  endLine: 1,
  endColumn: 1,
})._unsafeUnwrap();

function mk(nodeType: string, children: AstNode[] = []): AstNode {
  return Object.freeze({
    nodeType,
    position: somePosition,
    text: nodeType,
    children: Object.freeze(children),
  });
}

/** A(B(D, E), C) — enough shape for order, skip, and stop semantics. */
function tree(): { a: AstNode; b: AstNode } {
  const d = mk("D");
  const e = mk("E");
  const b = mk("B", [d, e]);
  const c = mk("C");
  const a = mk("A", [b, c]);
  return { a, b };
}

type Event = `${"enter" | "exit"} ${string}`;

function record(events: Event[]) {
  return {
    enter: (node: AstNode): void => {
      events.push(`enter ${node.nodeType}`);
    },
    exit: (node: AstNode): void => {
      events.push(`exit ${node.nodeType}`);
    },
  };
}

describe("visit", () => {
  it("fires enter pre-order and exit post-order over the whole subtree", () => {
    const events: Event[] = [];
    visit(tree().a, record(events));
    expect(events).toEqual([
      "enter A",
      "enter B",
      "enter D",
      "exit D",
      "enter E",
      "exit E",
      "exit B",
      "enter C",
      "exit C",
      "exit A",
    ]);
  });

  it("starts at an arbitrary subtree, not just file roots", () => {
    const events: Event[] = [];
    visit(tree().b, record(events));
    expect(events).toEqual(["enter B", "enter D", "exit D", "enter E", "exit E", "exit B"]);
  });

  it('"skip" from enter skips the children but still fires that node\'s exit', () => {
    const events: Event[] = [];
    const recorder = record(events);
    visit(tree().a, {
      enter: (node) => {
        recorder.enter(node);
        return node.nodeType === "B" ? "skip" : undefined;
      },
      exit: recorder.exit,
    });
    expect(events).toEqual(["enter A", "enter B", "exit B", "enter C", "exit C", "exit A"]);
  });

  it('"stop" from enter aborts the walk immediately', () => {
    const events: Event[] = [];
    const recorder = record(events);
    visit(tree().a, {
      enter: (node) => {
        recorder.enter(node);
        return node.nodeType === "B" ? "stop" : undefined;
      },
      exit: recorder.exit,
    });
    expect(events).toEqual(["enter A", "enter B"]);
  });

  it('"stop" from exit aborts the walk immediately', () => {
    const events: Event[] = [];
    const recorder = record(events);
    visit(tree().a, {
      enter: recorder.enter,
      exit: (node) => {
        recorder.exit(node);
        return node.nodeType === "D" ? "stop" : undefined;
      },
    });
    expect(events).toEqual(["enter A", "enter B", "enter D", "exit D"]);
  });

  it('"stop" from the exit of a skipped node aborts too', () => {
    const events: Event[] = [];
    const recorder = record(events);
    visit(tree().a, {
      enter: (node) => {
        recorder.enter(node);
        return node.nodeType === "B" ? "skip" : undefined;
      },
      exit: (node) => {
        recorder.exit(node);
        return node.nodeType === "B" ? "stop" : undefined;
      },
    });
    expect(events).toEqual(["enter A", "enter B", "exit B"]);
  });

  it("supports enter-only and exit-only visitors", () => {
    const entered: string[] = [];
    const exited: string[] = [];
    visit(tree().a, { enter: (node) => void entered.push(node.nodeType) });
    visit(tree().a, { exit: (node) => void exited.push(node.nodeType) });
    expect(entered).toEqual(["A", "B", "D", "E", "C"]);
    expect(exited).toEqual(["D", "E", "B", "C", "A"]);
  });

  it("visits a single leaf: one enter, one exit", () => {
    const events: Event[] = [];
    visit(mk("leaf"), record(events));
    expect(events).toEqual(["enter leaf", "exit leaf"]);
  });

  it("matches an independent recursive pre-order walk on a real parsed tree", async () => {
    const parsed = await parseOk(TS_FIXTURE);
    const viaVisit: AstNode[] = [];
    visit(parsed.root, { enter: (node) => void viaVisit.push(node) });
    const viaRecursion = collectNodes(parsed.root);
    expect(viaVisit.length).toBe(viaRecursion.length);
    viaVisit.forEach((node, index) => expect(Object.is(node, viaRecursion[index])).toBe(true));
  });
});
