# Phase 4 — Delegated Tool Adapters

> **Self-contained phase doc.** When done, set Current Phase to P5 and load [`phase-05-persistence.md`](./phase-05-persistence.md).

**Duration:** ~2 weeks
**Demoable:** ✅ Security demo — scan a deliberately-vulnerable fixture project; surface every issue.
**Prerequisites:** Phase 3 complete

---

## Goal

Security, secrets, CVEs, and duplication — delivered by proven third-party tools wrapped behind adapters. Each adapter is a drop-in replacement candidate via the contract test pattern.

---

## Required Reading Before Starting

- [`../00-principles.md`](../00-principles.md) §3 — note contract testing for adapters
- The `ToolAdapterPort` interface in `packages/core/src/ports/tool-adapter.ts`

---

## Tasks

### [P4-01] Tool adapter port and shared subprocess utilities

- **Deps:** P3 complete
- **Outputs:** `packages/adapters/_shared/`
  - Subprocess timeout handling
  - Output stream parsing helpers
  - Common error mapping to `Finding[]`
- **Acceptance:** All shared utilities have 100% coverage; contract test scaffold defined
- **Effort:** S

### [P4-02] jscpd adapter (duplication)

- **Deps:** P4-01
- **Outputs:** `packages/adapters/jscpd/`
- **Acceptance:**
  - Runs jscpd as a library, parses JSON output
  - Contract tests pass; can be swapped for an alternative clone detector without further changes
- **Effort:** M

### [P4-03] Semgrep adapter (security patterns)

- **Deps:** P4-01
- **Outputs:** `packages/adapters/semgrep/`
- **Acceptance:**
  - Bundles default rule pack (OWASP Top 10)
  - Custom rule extension via config
  - Findings mapped to `Violation` with correct severity translation
- **Effort:** M

### [P4-04] TruffleHog adapter (secrets)

- **Deps:** P4-01
- **Outputs:** `packages/adapters/trufflehog/`
- **Acceptance:**
  - Detects all standard secret formats in fixture files
  - Redacts secret values in output (no leakage into logs)
  - Allowlist support for test fixtures
- **Effort:** M

### [P4-05] osv-scanner adapter (CVEs)

- **Deps:** P4-01
- **Outputs:** `packages/adapters/osv/`
- **Acceptance:**
  - Detects CVEs in npm, pip, cargo, and Go lock files
  - Output includes remediation (target version)
- **Effort:** M

### [P4-06] license-checker adapter

- **Deps:** P4-01
- **Outputs:** `packages/adapters/license-checker/`
- **Acceptance:**
  - Identifies SPDX license per dependency
  - Flags violations against configurable allowed-license list
- **Effort:** S

---

## Phase 4 Exit Criteria

- [ ] Each adapter is a drop-in replacement candidate (contract tests passing)
- [ ] Security demo recorded
- [ ] Phase handover captures subprocess gotchas (signal handling, exit codes per tool) and tool version pinning policy

---

## Phase-Specific Notes

- **Pin tool versions aggressively.** Semgrep and TruffleHog change output formats between minor versions. Pin in `package.json` (for npm wrappers) or `docker-compose.yml` (for binaries).
- **Subprocess timeouts are mandatory.** Every adapter wraps its tool in a timeout (default 5 minutes). A hung subprocess shouldn't hang the whole scan.
- **Secret redaction is non-negotiable.** TruffleHog can return the actual secret value. NEVER log it, NEVER include it in JSON output. Replace with `<REDACTED:length=N>`.
- **OSV database queries can be rate-limited.** Cache results aggressively (24-hour TTL is reasonable). Don't hammer the API on every scan.
- **Adapters depend only on `_shared` and `core` — never on each other.** Composition happens at the orchestrator level.

---

## Definition of Done for Phase 4

The next agent can:

1. Run a scan and see security, secret, CVE, license, and duplication findings alongside code-quality and architecture findings
2. Swap any single adapter for an alternative implementation by writing a new adapter that passes the contract tests
3. Start Phase 5 with full analysis coverage in place
