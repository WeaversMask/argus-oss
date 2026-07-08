import {
  completeScan,
  filePath,
  position,
  projectId,
  queueScan,
  ruleId,
  scanId,
  scanResult,
  startScan,
  suppression,
  suppressionId,
  timestamp,
  violation,
  violationId,
  type CompletedScan,
  type FilePath,
  type ParsedFile,
  type Position,
  type Project,
  type ProjectId,
  type QueuedScan,
  type ScanId,
  type Suppression,
  type Violation,
} from "@argus/core";

export function someFilePath(value = "src/example.ts"): FilePath {
  return filePath(value)._unsafeUnwrap();
}

export function someProjectId(value = "argus"): ProjectId {
  return projectId(value)._unsafeUnwrap();
}

export function someScanId(value = "scan-1"): ScanId {
  return scanId(value)._unsafeUnwrap();
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

export function someViolation(id = "v-1"): Violation {
  return violation({
    id: violationId(id)._unsafeUnwrap(),
    ruleId: ruleId("no-deep-nesting")._unsafeUnwrap(),
    severity: "warning",
    message: "Nesting depth 6 exceeds the maximum of 4",
    position: somePosition(),
  })._unsafeUnwrap();
}

export function someProject(id = "argus", name = "Argus"): Project {
  return { id: someProjectId(id), name, rootPath: someFilePath("/repos/argus") };
}

export function someQueuedScan(id = "scan-1", project = "argus"): QueuedScan {
  return queueScan({
    id: someScanId(id),
    projectId: someProjectId(project),
    mode: "full",
    queuedAt: timestamp(1_000)._unsafeUnwrap(),
  });
}

export function someCompletedScan(id = "scan-1"): CompletedScan {
  const running = startScan(someQueuedScan(id), timestamp(1_500)._unsafeUnwrap())._unsafeUnwrap();
  const result = scanResult({ violations: [], filesScanned: 3 })._unsafeUnwrap();
  return completeScan(running, timestamp(2_000)._unsafeUnwrap(), result)._unsafeUnwrap();
}

export function someSuppression(id = "s-1"): Suppression {
  return suppression({
    id: suppressionId(id)._unsafeUnwrap(),
    ruleId: ruleId("no-deep-nesting")._unsafeUnwrap(),
    pathPattern: "src/legacy/**",
    reason: "Grandfathered until the legacy module is retired",
    createdAt: timestamp(1_000)._unsafeUnwrap(),
  })._unsafeUnwrap();
}

export function someParsedFile(file = "src/example.ts"): ParsedFile {
  const path = someFilePath(file);
  return {
    file: path,
    language: "typescript",
    root: {
      nodeType: "program",
      position: position({
        file: path,
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 1,
      })._unsafeUnwrap(),
      text: "",
      children: [],
    },
  };
}
