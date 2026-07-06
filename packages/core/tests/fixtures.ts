import { filePath, type FilePath } from "../src/domain/file-path.js";
import { violationId } from "../src/domain/ids.js";
import { position, type Position } from "../src/domain/position.js";
import { ruleId } from "../src/domain/rule.js";
import type { Severity } from "../src/domain/severity.js";
import { timestamp, type Timestamp } from "../src/domain/timestamp.js";
import { violation, type Violation } from "../src/domain/violation.js";

export function someFilePath(value = "src/example.ts"): FilePath {
  return filePath(value)._unsafeUnwrap();
}

export function somePosition(): Position {
  return position({
    file: someFilePath(),
    startLine: 1,
    startColumn: 1,
    endLine: 2,
    endColumn: 5,
  })._unsafeUnwrap();
}

export function someTimestamp(epochMs = 1_750_000_000_000): Timestamp {
  return timestamp(epochMs)._unsafeUnwrap();
}

export function someViolation(severity: Severity = "error", id = "v-1"): Violation {
  return violation({
    id: violationId(id)._unsafeUnwrap(),
    ruleId: ruleId("architecture/no-god-objects")._unsafeUnwrap(),
    severity,
    message: "File exceeds 300 lines",
    position: somePosition(),
  })._unsafeUnwrap();
}
