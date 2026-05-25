# Argus — Implementation Tracker

> **Live document.** Always reflects current state. Update on every task transition.

**Last updated:** _2026-05-25 by claude-opus-4-7_
**Current phase:** _Phase 0 — Foundation_
**Active phase doc:** [`plan/phases/phase-00-foundation.md`](./plan/phases/phase-00-foundation.md)
**Overall progress:** _4 of 8 P0 tasks complete (0 of 12 phases complete)_

---

## Active Work

### In Progress

| Task ID | Title | Assignee | Started | ETA |
| ------- | ----- | -------- | ------- | --- |
| _—_     | _—_   | _—_      | _—_     | _—_ |

### Blocked

| Task ID | Title | Blocker | Since |
| ------- | ----- | ------- | ----- |
| _—_     | _—_   | _—_     | _—_   |

### Up Next (top of backlog within current phase)

1. _P0-05 — GitHub Actions CI pipeline (extends existing ci.yml with typecheck/test/build)_
2. _P0-06 — Docker development environment_
3. _P0-07 — Documentation scaffolding + ADR-0001_

---

## Phase Status

| Phase                  | Status         | Completed | Notes                 |
| ---------------------- | -------------- | --------- | --------------------- |
| P0 — Foundation        | 🟡 In progress | 4/8       | P0-04 done 2026-05-25 |
| P1 — Domain Core       | ⏸ Not started  | —         | —                     |
| P2 — MVP               | ⏸ Not started  | —         | —                     |
| P3 — Layer Enforcement | ⏸ Not started  | —         | —                     |
| P4 — Tool Adapters     | ⏸ Not started  | —         | —                     |
| P5 — Persistence       | ⏸ Not started  | —         | —                     |
| P6 — API Server        | ⏸ Not started  | —         | —                     |
| P7 — Web UI            | ⏸ Not started  | —         | —                     |
| P8 — Reporting         | ⏸ Not started  | —         | —                     |
| P9 — CI Integrations   | ⏸ Not started  | —         | —                     |
| P10 — LSP + IDE        | ⏸ Not started  | —         | —                     |
| P11 — Hardening & GA   | ⏸ Not started  | —         | —                     |

**Status legend:** ⏸ not started · 🟡 in progress · ✅ complete · 🔴 blocked

---

## Recently Completed (last 10 tasks)

| Task ID | Title                                                | Completed  | PR                                                | Notes                                                                                                                                                                                                                                                                                           |
| ------- | ---------------------------------------------------- | ---------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-04   | Vitest test infrastructure                           | 2026-05-25 | _pending_                                         | Vitest 4.1.7 + @vitest/coverage-v8; first persistent workspace package `@argus/testing` with `defineProjectConfig`, `fakeSecret()`, and `toBeNonEmpty` custom matcher; root `vitest.config.ts` runs all projects in one invocation with aggregated coverage at 85% line / 80% branch thresholds |
| P0-03   | ESLint + Prettier + commitlint + gitleaks            | 2026-05-24 | _pending_                                         | ESLint 10 flat config, Prettier 3.8, commitlint 21 (conventional), Husky 9, gitleaks 8.30.1 via repo-local .bin/; CI workflow with lint/format/commitlint/secret-scan jobs                                                                                                                      |
| P0-02   | Base TypeScript configuration                        | 2026-05-23 | [#2](https://github.com/WeaversMask/argus/pull/2) | TS 6.0.3 pinned; tsconfig.base.json with strict + verbatimModuleSyntax; "no any in linter" deferred to P0-03 (delivered)                                                                                                                                                                        |
| P0-01   | Initialise monorepo with pnpm workspaces + Turborepo | 2026-05-23 | [#1](https://github.com/WeaversMask/argus/pull/1) | pnpm 9.15.9 pinned; turbo 2.x; workspace:\* smoke-tested                                                                                                                                                                                                                                        |

---

## Open Decisions

> Decisions awaiting a human architect. Agents pick another task while waiting.

| ID  | Question | Raised by | Raised on | Options | Recommendation |
| --- | -------- | --------- | --------- | ------- | -------------- |
| _—_ | _—_      | _—_       | _—_       | _—_     | _—_            |

---

## Open Risks

> Currently active risks. Full register at [`risks.md`](./risks.md).

| Risk ID | Description | Impact | Mitigation |
| ------- | ----------- | ------ | ---------- |
| _—_     | _—_         | _—_    | _—_        |

---

## Metrics Snapshot

- **Test coverage:** 100% lines / 100% branches on `@argus/testing` (9 tests, only package with sources today)
- **Self-scan results:** _—_
- **CI build time (cold / cached):** _—_

---

## Recent ADRs

See [`adr/`](./adr/) for full list.

- _ADR-0001 — Monorepo with pnpm workspaces (pending Phase 0)_

---

## Notes for Agents

- The phase file at the link above contains every task you need for the current phase. **Do not load other phase files** unless doing explicit cross-phase work.
- If you finish a phase, update the "Current phase" field above and the next picker will load the next phase file.
- For PR template, see [`plan/templates/PR.template.md`](./plan/templates/PR.template.md).
