import type { AstNode } from "@argus/core";

/**
 * Single-pass depth-first walk: `onEnter` fires before a node's children
 * (pre-order), `onExit` after them (post-order). No flow control — the walk
 * is shared by every active rule, and per-rule `skip`/`stop` would starve
 * the other rules (use `@argus/ast`'s `visit` for standalone traversal).
 *
 * The engine keeps its own walk instead of importing `@argus/ast`'s: the
 * engine is domain-side orchestration and must not depend on an adapter
 * package for a 30-line traversal.
 *
 * Iterative on an explicit stack: arbitrarily deep trees cannot overflow
 * the call stack (P1-03 convention, kept deliberately).
 */
export function walk(
  root: AstNode,
  onEnter: (node: AstNode) => void,
  onExit: (node: AstNode) => void,
): void {
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
      onEnter(top.node);
    }
    const child = top.node.children[top.nextChild];
    if (child === undefined) {
      onExit(top.node);
      continue;
    }
    top.nextChild += 1;
    stack.push(top);
    stack.push({ node: child, nextChild: 0 });
  }
}
