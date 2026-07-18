import { filePath, layerName, rule, ruleId } from "@argus/core";
import type {
  AstNode,
  FilePath,
  Language,
  LayerName,
  Rule,
  RuleActivation,
  RuleId,
  RuleRunInput,
  Severity,
} from "@argus/core";
import type { RuleContext, RuleListeners, RuleModule } from "../src/index.js";

export const DEFAULT_FILE: FilePath = filePath("src/example.ts")._unsafeUnwrap();

export function someFile(value: string): FilePath {
  return filePath(value)._unsafeUnwrap();
}

export function rid(value: string): RuleId {
  return ruleId(value)._unsafeUnwrap();
}

export function someLayer(value = "domain"): LayerName {
  return layerName(value)._unsafeUnwrap();
}

export function ruleOf(id: string, defaultSeverity: Severity = "warning"): Rule {
  return rule({
    id: rid(id),
    name: id,
    description: `test rule ${id}`,
    defaultSeverity,
  })._unsafeUnwrap();
}

/** Builds a module from static listeners or a full `create` implementation. */
export function moduleOf(
  id: string,
  listeners: RuleListeners | ((context: RuleContext) => RuleListeners),
): RuleModule {
  return {
    rule: ruleOf(id),
    create: typeof listeners === "function" ? listeners : () => listeners,
  };
}

export function activationOf(
  id: string,
  severity: Severity | "off" = "warning",
  options: Readonly<Record<string, unknown>> = {},
): RuleActivation {
  return Object.freeze({
    ruleId: rid(id),
    severity,
    options: Object.freeze({ ...options }),
  });
}

export interface NodeSpec {
  readonly nodeType: string;
  readonly children?: readonly AstNode[];
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly text?: string;
  readonly fieldName?: string;
  readonly file?: FilePath;
}

/** Frozen synthetic node; positions default to a 1-wide range on `startLine`. */
export function makeNode(spec: NodeSpec): AstNode {
  const startLine = spec.startLine ?? 1;
  const startColumn = spec.startColumn ?? 1;
  return Object.freeze({
    nodeType: spec.nodeType,
    ...(spec.fieldName !== undefined ? { fieldName: spec.fieldName } : {}),
    position: Object.freeze({
      file: spec.file ?? DEFAULT_FILE,
      startLine,
      startColumn,
      endLine: spec.endLine ?? startLine,
      endColumn: spec.endColumn ?? startColumn + 1,
    }),
    text: spec.text ?? spec.nodeType,
    children: Object.freeze([...(spec.children ?? [])]),
  });
}

export function inputOf(
  root: AstNode,
  activations: readonly RuleActivation[],
  extras: { layer?: LayerName; file?: FilePath; language?: Language } = {},
): RuleRunInput {
  return Object.freeze({
    parsed: Object.freeze({
      file: extras.file ?? DEFAULT_FILE,
      language: extras.language ?? "typescript",
      root,
    }),
    activations: Object.freeze([...activations]),
    ...(extras.layer !== undefined ? { layer: extras.layer } : {}),
  });
}

/**
 * Node-type vocabulary for synthetic trees. Deliberately includes anonymous
 * grammar types (keywords, punctuation) — real trees dispatch those too
 * (P1-03 convention).
 */
export const NODE_TYPES: readonly string[] = Object.freeze([
  "module",
  "function_declaration",
  "identifier",
  "call_expression",
  "statement_block",
  "let",
  "(",
  ")",
  "string",
  "number",
]);

/**
 * Deterministic tree with exactly `count` nodes: node `i` is a child of
 * node `floor((i - 1) / branch)`, types cycle through {@link NODE_TYPES},
 * node `i` sits on line `i + 1`. Built bottom-up so every node is frozen.
 */
export function syntheticTree(count: number, branch = 8, file = DEFAULT_FILE): AstNode {
  const childIndices: number[][] = Array.from({ length: count }, () => []);
  for (let i = 1; i < count; i += 1) {
    childIndices[Math.floor((i - 1) / branch)]!.push(i);
  }
  const nodes = new Array<AstNode>(count);
  for (let i = count - 1; i >= 0; i -= 1) {
    nodes[i] = makeNode({
      nodeType: NODE_TYPES[i % NODE_TYPES.length]!,
      file,
      startLine: i + 1,
      children: childIndices[i]!.map((child) => nodes[child]!),
    });
  }
  return nodes[0]!;
}

/** A `depth`-node linear spine, for stack-safety tests. */
export function chainTree(depth: number, file = DEFAULT_FILE): AstNode {
  let node = makeNode({ nodeType: "leaf", file, startLine: depth });
  for (let line = depth - 1; line >= 1; line -= 1) {
    node = makeNode({ nodeType: "wrapper", file, startLine: line, children: [node] });
  }
  return node;
}

/** Recursive pre-order collector, independent of the engine's walk. */
export function collectNodes(root: AstNode): AstNode[] {
  const acc: AstNode[] = [];
  const collect = (node: AstNode): void => {
    acc.push(node);
    node.children.forEach(collect);
  };
  collect(root);
  return acc;
}
