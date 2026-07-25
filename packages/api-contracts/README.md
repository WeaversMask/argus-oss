# `@argus/api-contracts`

> The wire format: zod schemas and inferred types for everything Argus emits to a machine.

## Purpose

This package owns the shapes that cross a process boundary — today the JSON scan report `argus check --format json` prints, later the HTTP payloads the API server (Phase 6) and the web UI (Phase 7) will share. One schema, validated on both sides, so producer and consumer cannot drift apart silently.

It deliberately does **not** depend on `@argus/core`. A consumer of the wire format — a CI script, an HTTP client, a browser — has no domain layer to import, and the whole value of a contract package is that it can be adopted alone. That means the domain and the contract each own their vocabulary, and the code that maps between them owns the agreement: `apps/cli/tests/formatters/json.test.ts` asserts that core's `SEVERITIES` and this package's `severitySchema` describe exactly the same set.

It holds no logic either — no serialisation, no formatting, no I/O. It is a description of shapes, and its only dependency is zod.

## Public surface

| Export                          | Kind          | Summary                                                                     |
| ------------------------------- | ------------- | --------------------------------------------------------------------------- |
| `scanReportSchema`              | zod schema    | A complete scan outcome: tool, summary, violations, failures                |
| `violationSchema`               | zod schema    | One rule breach — file, position, severity, message, optional layer         |
| `positionSchema`                | zod schema    | A 1-based, end-exclusive source range (no file — it lives on the violation) |
| `scanFailureSchema`             | zod schema    | A file that could not be analysed, with the reason                          |
| `scanSummarySchema`             | zod schema    | Totals: files scanned, violation count, failure count, counts per severity  |
| `severityCountsSchema`          | zod schema    | Violation counts per severity, all four keys always present                 |
| `severitySchema`                | zod schema    | The severity vocabulary: `info` \| `warning` \| `error` \| `critical`       |
| `SCAN_REPORT_CONTRACT_VERSION`  | const         | The version every payload carries (`1`)                                     |
| `ScanReportPayload` and friends | inferred type | `z.infer` of each schema above — never hand-written                         |

Every schema is **strict**: an unknown key is a contract violation, not something to ignore. That makes these **producer-conformance** schemas — a producer that invents a field fails its own tests instead of shipping a shape consumers cannot rely on. See Maintenance notes for what strictness means on the consuming side.

## How it fits

- **Depends on:** `zod` only. No internal packages — by design (see Purpose).
- **Consumed by:** `@argus/cli` (`--format json`); the API server and web UI when they land.
- **Boundary rules:** `api-contracts-public-entry-only` in [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs) — imports must land on `src/index.ts`.

## Usage

```ts
import { SCAN_REPORT_CONTRACT_VERSION, scanReportSchema } from "@argus/api-contracts";

const document: unknown = JSON.parse(stdout);

// Check the version you were handed before committing to a shape: a payload
// from a newer Argus may carry fields this package does not know about, and
// the schemas below are strict.
if ((document as { contractVersion?: number }).contractVersion !== SCAN_REPORT_CONTRACT_VERSION) {
  throw new Error("unsupported Argus scan-report version");
}

const report = scanReportSchema.parse(document);
for (const violation of report.violations) {
  console.log(`${violation.file}:${violation.position.startLine} ${violation.ruleId}`);
}

// A scan is clean only if nothing failed to analyse, too.
const clean = report.violations.length === 0 && report.failures.length === 0;
```

## Maintenance notes

- **Versioning, and what strictness does to it.** `SCAN_REPORT_CONTRACT_VERSION` is bumped only on a **breaking** change — a removed or retyped field, or a narrowed value set. Adding an optional field leaves the version alone, because a consumer reading the fields it already knows is unaffected. But these schemas are strict, so a consumer that _validates_ with them is pinned to the package version it installed: an additive change is breaking for that consumer until it upgrades the package. That is the deliberate trade — strictness is worth more on the producing side, where it is the only thing stopping an invented field from shipping. A consumer that must survive additions without upgrading should check `contractVersion` and parse permissively rather than reach for these schemas (see Usage).
- **Two invariants the schema cannot express**, both guaranteed by the producer and documented on the schema: `violations` is sorted by file → start line → start column → rule id → violation id (so re-scanning unchanged sources gives byte-identical output; the id is what makes the order _total_, since one rule can report twice at one position), and `summary` counts agree with the arrays.
- **`summary.filesScanned` counts files _selected_ for scanning, failures included** — it is not a count of successfully analysed files. Anything computing a rate from it should subtract `failures.length`.
- **`failures` is part of the report, never a side channel.** A payload with an empty `violations` array and a non-empty `failures` array is a _partial_ scan, not a clean one — a consumer that only reads `violations` will report a green build on a scan that never ran.
- Private workspace package; not published. See [D-8](../../docs/IMPLEMENTATION.md) for the packaging decision.
