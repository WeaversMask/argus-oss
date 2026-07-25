import { z } from "zod";

/**
 * Version of the scan-report contract, carried in every payload.
 *
 * Bumped only on a **breaking** change — a removed or retyped field, or a
 * narrowed value set. Adding an optional field is backwards compatible and
 * leaves the version alone. Consumers should reject a payload whose version
 * they do not know rather than guess at the shape.
 */
export const SCAN_REPORT_CONTRACT_VERSION = 1;

/**
 * Severity vocabulary, least to most severe.
 *
 * Deliberately spelled out here rather than imported from `@argus/core`: this
 * package is the wire contract, and a consumer that speaks it (an HTTP client,
 * a CI script, the future web UI) has no domain layer to import. Agreement
 * with the domain is a test obligation of whoever maps domain to wire — see
 * `apps/cli/tests/formatters/json.test.ts`.
 */
export const severitySchema = z.enum(["info", "warning", "error", "critical"]);

export type SeverityPayload = z.infer<typeof severitySchema>;

/**
 * A source range inside one file. 1-based, end-exclusive (the domain's D-3a
 * convention, shared with LSP, SARIF and tree-sitter): `start === end` is a
 * zero-width point, and a same-line range is `endColumn - startColumn` wide.
 *
 * The file is not repeated here — it lives once on the violation.
 */
export const positionSchema = z
  .strictObject({
    startLine: z.int().min(1),
    startColumn: z.int().min(1),
    endLine: z.int().min(1),
    endColumn: z.int().min(1),
  })
  .refine(
    (position) =>
      position.endLine > position.startLine ||
      (position.endLine === position.startLine && position.endColumn >= position.startColumn),
    { error: "end must not precede start" },
  );

export type PositionPayload = z.infer<typeof positionSchema>;

/**
 * One rule breach. `file` is a path relative to the project root (the
 * directory holding `argus.yaml`), using forward slashes on every platform,
 * so the same scan reads identically wherever it ran.
 */
export const violationSchema = z.strictObject({
  /** Stable within one scan; not a durable identifier across scans. */
  id: z.string().min(1),
  ruleId: z.string().min(1),
  severity: severitySchema,
  message: z.string().min(1),
  file: z.string().min(1),
  position: positionSchema,
  /** Architectural layer of the file, when the project classifies layers. */
  layer: z.string().min(1).optional(),
});

export type ViolationPayload = z.infer<typeof violationSchema>;

/**
 * A file that could not be analysed — unreadable, unparseable, or a rule
 * crash while running against it.
 *
 * Failures are part of the report, never a side channel: a consumer that sees
 * an empty `violations` array while `failures` is non-empty is looking at a
 * partial scan, not a clean one.
 */
export const scanFailureSchema = z.strictObject({
  file: z.string().min(1),
  message: z.string().min(1),
});

export type ScanFailurePayload = z.infer<typeof scanFailureSchema>;

/** Violation counts per severity. Every severity is present, zeros included. */
export const severityCountsSchema = z.strictObject({
  info: z.int().min(0),
  warning: z.int().min(0),
  error: z.int().min(0),
  critical: z.int().min(0),
});

export type SeverityCountsPayload = z.infer<typeof severityCountsSchema>;

/** Totals, so a consumer can report the headline without walking the arrays. */
export const scanSummarySchema = z.strictObject({
  filesScanned: z.int().min(0),
  violations: z.int().min(0),
  failures: z.int().min(0),
  bySeverity: severityCountsSchema,
});

export type ScanSummaryPayload = z.infer<typeof scanSummarySchema>;

/**
 * The complete outcome of one scan, as emitted by `argus check --format json`.
 *
 * Strict at every level: an unknown key is a contract violation, not something
 * to ignore, so a producer that invents a field fails its own tests instead of
 * shipping a shape consumers cannot rely on.
 *
 * **Ordering is part of the contract.** `violations` is sorted by file, then
 * start line, then start column, then rule id — two scans of unchanged sources
 * produce byte-identical JSON, which is what makes the output diffable in CI.
 */
export const scanReportSchema = z.strictObject({
  contractVersion: z.literal(SCAN_REPORT_CONTRACT_VERSION),
  tool: z.strictObject({
    name: z.literal("argus"),
    version: z.string().min(1),
  }),
  summary: scanSummarySchema,
  violations: z.array(violationSchema),
  failures: z.array(scanFailureSchema),
});

export type ScanReportPayload = z.infer<typeof scanReportSchema>;
