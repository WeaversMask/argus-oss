import type { AstNode } from "@argus/core";

/**
 * Flow control returned from visitor callbacks: `"skip"` skips the node's
 * children (its own `exit` still runs), `"stop"` aborts the whole walk.
 */
export type VisitControl = "skip" | "stop";

/** Callbacks passed to {@link visit}, fired in pre-order (`enter`) and post-order (`exit`). */
export interface Visitor {
  /** Called before a node's children, in source (pre-)order. */
  readonly enter?: (node: AstNode) => VisitControl | void;
  /** Called after a node's children (post-order). `"skip"` is meaningless here, so only `"stop"` is accepted. */
  readonly exit?: (node: AstNode) => "stop" | void;
}

/**
 * Depth-first walk over any `AstNode` subtree — `root` does not have to be
 * a file root; visiting starts (and `enter`/`exit` fire) at the node given.
 *
 * Iterative on an explicit stack: arbitrarily deep trees cannot overflow
 * the call stack.
 */
export function visit(root: AstNode, visitor: Visitor): void {
  interface Entry {
    readonly node: AstNode;
    nextChild: number;
  }
  const stack: Entry[] = [{ node: root, nextChild: 0 }];
  for (;;) {
    const top = stack.pop();
    if (top === undefined) {
      return;
    }
    if (top.nextChild === 0) {
      const control = visitor.enter?.(top.node);
      if (control === "stop") {
        return;
      }
      if (control === "skip") {
        if (visitor.exit?.(top.node) === "stop") {
          return;
        }
        continue;
      }
    }
    const child = top.node.children[top.nextChild];
    if (child === undefined) {
      if (visitor.exit?.(top.node) === "stop") {
        return;
      }
      continue;
    }
    top.nextChild += 1;
    stack.push(top);
    stack.push({ node: child, nextChild: 0 });
  }
}
