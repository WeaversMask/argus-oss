import { filePath } from "../../src/domain/file-path.js";
import type { FilePath } from "../../src/domain/file-path.js";
import { violationId } from "../../src/domain/ids.js";
import { layerManifest, layerName } from "../../src/domain/layer.js";
import type { LayerManifest, LayerName } from "../../src/domain/layer.js";
import { ruleId } from "../../src/domain/rule.js";
import type { RuleId } from "../../src/domain/rule.js";
import { suppression } from "../../src/domain/suppression.js";
import type { Suppression } from "../../src/domain/suppression.js";
import { suppressionId } from "../../src/domain/ids.js";
import { timestamp } from "../../src/domain/timestamp.js";
import type { Timestamp } from "../../src/domain/timestamp.js";
import { violation } from "../../src/domain/violation.js";
import type { Violation } from "../../src/domain/violation.js";

export function file(value: string): FilePath {
  return filePath(value)._unsafeUnwrap();
}

export function name(value: string): LayerName {
  return layerName(value)._unsafeUnwrap();
}

export function rid(value: string): RuleId {
  return ruleId(value)._unsafeUnwrap();
}

export function at(epochMs: number): Timestamp {
  return timestamp(epochMs)._unsafeUnwrap();
}

/** Manifest from `[name, patterns]` pairs; boundaries stay empty (not under test here). */
export function manifestOf(
  layers: readonly (readonly [string, readonly string[]])[],
): LayerManifest {
  return layerManifest({
    layers: layers.map(([layer, patterns]) => ({
      name: name(layer),
      description: `${layer} layer`,
      patterns,
    })),
    boundaries: [],
  })._unsafeUnwrap();
}

export function violationAt(fileValue: string, rule = "style/no-let"): Violation {
  return violation({
    id: violationId(`${rule}@${encodeURIComponent(fileValue)}`)._unsafeUnwrap(),
    ruleId: rid(rule),
    severity: "warning",
    message: "test violation",
    position: {
      file: file(fileValue),
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 2,
    },
  })._unsafeUnwrap();
}

export function suppressionOf(input: {
  readonly rule?: string;
  readonly pathPattern: string;
  readonly createdAt?: number;
  readonly expiresAt?: number;
  readonly id?: string;
}): Suppression {
  return suppression({
    id: suppressionId(input.id ?? "s-1")._unsafeUnwrap(),
    ruleId: rid(input.rule ?? "style/no-let"),
    pathPattern: input.pathPattern,
    reason: "test suppression",
    createdAt: at(input.createdAt ?? 1_000),
    ...(input.expiresAt !== undefined ? { expiresAt: at(input.expiresAt) } : {}),
  })._unsafeUnwrap();
}
