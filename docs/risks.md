# Risk Register

> **Load on demand** when identifying or closing a risk. Active risks also surface in [`IMPLEMENTATION.md`](./IMPLEMENTATION.md).

## Active Risks

| Risk ID | Description                                                                                    | Likelihood | Impact | Mitigation                                                                                                                                                            | Owner | Status |
| ------- | ---------------------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| R-001   | Tree-sitter grammar bugs cause false positives                                                 | M          | H      | Pin versions; smoke-test suite on grammar bumps; allow per-file grammar override                                                                                      | —     | Open   |
| R-002   | Performance degrades on monorepos >2M LoC                                                      | M          | M      | Performance budget per phase; benchmark suite from P2 onwards                                                                                                         | —     | Open   |
| R-003   | Layer manifest authoring is too complex for users                                              | H          | H      | Visual editor (P7-07); shipped templates; tutorial-driven docs                                                                                                        | —     | Open   |
| R-004   | Delegated tools (Semgrep, jscpd) change CLI contracts                                          | M          | M      | Pin versions; contract tests on every adapter; alternative adapter ready                                                                                              | —     | Open   |
| R-005   | SQLite write contention in CI runner mode                                                      | L          | M      | Migration path to Postgres; advisory locks; documented limits                                                                                                         | —     | Open   |
| R-006   | OSS-licence-incompatible dependencies sneak in                                                 | L          | H      | SPDX allowlist gate in CI + local script (P0-12); policy fixed in ADR-0002                                                                                            | —     | Open   |
| R-007   | Auto-fix corrupts source files                                                                 | L          | H      | All fixes via magic-string; round-trip tests; backups before fix                                                                                                      | —     | Open   |
| R-008   | Long-running scans block CI queue                                                              | M          | M      | Job timeouts; cancellation; priority queues for diff scans                                                                                                            | —     | Open   |
| R-009   | Browser-based UI exposes stack traces                                                          | L          | M      | Error-boundary policy; no internal errors leak to client                                                                                                              | —     | Open   |
| R-010   | Suppression abuse hides real issues                                                            | M          | M      | Suppression audit log; expiring suppressions; org-level policy override                                                                                               | —     | Open   |
| R-011   | Copyleft engine (TruffleHog/Semgrep) linked or vendored instead of subprocess-invoked          | L          | H      | ADR-0002 mandates subprocess-only + no vendoring; CONTRIBUTING guardrail; license gate; adapter contract tests                                                        | —     | Open   |
| R-012   | Malicious newly-published dependency version pulled in during resolution (`pnpm add` / update) | M          | H      | 3-day `minimumReleaseAge` + dependency-script blocking (P0-14, ADR-0003); Dependabot cooldown (P0-13); weekly audit (P0-07); manual release-age check for urgent adds | —     | Open   |
| R-013   | Mutable GitHub Action tags or unverified binary downloads compromise CI or dev machines        | L          | H      | SHA-pinned actions + Dependabot `github-actions` updates + checksum-verified gitleaks install (P0-13)                                                                 | —     | Open   |

## Closed Risks

| Risk ID | Description | Closed Date | Resolution |
| ------- | ----------- | ----------- | ---------- |
| _—_     | _—_         | _—_         | _—_        |

---

## Likelihood × Impact Matrix

|                       | Low Impact | Medium Impact | High Impact             |
| --------------------- | ---------- | ------------- | ----------------------- |
| **High Likelihood**   | Monitor    | Mitigate      | **Address immediately** |
| **Medium Likelihood** | Monitor    | Mitigate      | Mitigate                |
| **Low Likelihood**    | Accept     | Monitor       | Mitigate                |

## Adding a New Risk

1. Add a row to "Active Risks" with the next available ID (R-NNN)
2. Surface in `IMPLEMENTATION.md` → "Open Risks" if it's actively affecting work
3. Reference it in any ADR that introduces a new dependency or design choice that creates the risk

## Closing a Risk

1. Move the row from "Active Risks" to "Closed Risks"
2. Document the resolution (e.g. "Mitigated by P5-01 migration system" or "No longer applicable after design change in ADR-0012")
3. Remove from `IMPLEMENTATION.md` → "Open Risks"
