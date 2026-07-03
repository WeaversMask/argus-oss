# Argus — Implementation Tracker

> **Live document.** Always reflects current state. Update on every task transition.

**Last updated:** _2026-07-03 by claude-fable-5_
**Current phase:** _Phase 0 — Foundation_
**Active phase doc:** [`plan/phases/phase-00-foundation.md`](./plan/phases/phase-00-foundation.md)
**Overall progress:** _9 of 16 P0 tasks complete (0 of 12 phases complete)_

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

> Resequenced 2026-06-12 (maintainer-approved): supply-chain controls (P0-14) land **before** any dependency-adding task; process tasks P0-15/P0-16 precede the licensing arc's resumption. New specs P0-13..P0-16 in [phase-00](./plan/phases/phase-00-foundation.md).

1. _P0-11 — Third-party notices, prerequisites & contributor guardrail_ (licensing arc resumes; see [archived handover](./handovers/p0-10-license-policy-handover.md); dep P0-10 ✅)
2. _P0-07 — Lightweight dependency audit in CI_ (stopgap pending P11-02 — see [phase-00 task spec](./plan/phases/phase-00-foundation.md))
3. _P0-12 — License-compliance guardrail (SPDX allowlist) in CI + local script_ (deps P0-10 ✅, P0-07)
4. _P0-13 — CI supply-chain hardening_ (after P0-07/P0-12 — shared `ci.yml` edits)
5. _P0-06 — Docker development environment_
6. _P0-08 — Documentation scaffolding + ADR-0001 + SECURITY.md_
7. _P0-09 — Changesets release workflow_

---

## Phase Status

| Phase                  | Status         | Completed | Notes                                                                                                     |
| ---------------------- | -------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| P0 — Foundation        | 🟡 In progress | 9/16      | P0-14 + P0-16 done 2026-07-02 (supply-chain gate live; lint-staged hooks); licensing arc resumes at P0-11 |
| P1 — Domain Core       | ⏸ Not started  | —         | —                                                                                                         |
| P2 — MVP               | ⏸ Not started  | —         | —                                                                                                         |
| P3 — Layer Enforcement | ⏸ Not started  | —         | —                                                                                                         |
| P4 — Tool Adapters     | ⏸ Not started  | —         | —                                                                                                         |
| P5 — Persistence       | ⏸ Not started  | —         | —                                                                                                         |
| P6 — API Server        | ⏸ Not started  | —         | —                                                                                                         |
| P7 — Web UI            | ⏸ Not started  | —         | —                                                                                                         |
| P8 — Reporting         | ⏸ Not started  | —         | —                                                                                                         |
| P9 — CI Integrations   | ⏸ Not started  | —         | —                                                                                                         |
| P10 — LSP + IDE        | ⏸ Not started  | —         | —                                                                                                         |
| P11 — Hardening & GA   | ⏸ Not started  | —         | —                                                                                                         |

**Status legend:** ⏸ not started · 🟡 in progress · ✅ complete · 🔴 blocked

---

## Recently Completed (last 10 tasks)

| Task ID | Title                                                          | Completed  | PR                                                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------- | -------------------------------------------------------------- | ---------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01  | Dependabot fix: vite 8.0.16 + js-yaml 4.2.0 (scoped overrides) | 2026-07-03 | [#13](https://github.com/WeaversMask/argus/pull/13) | Dev-only transitives (GHSA-fx2h-pf6j-xcff high + 2 moderate); `pnpm update` can't reach non-direct transitives → range-scoped overrides in `pnpm-workspace.yaml` with removal-condition comment; both patched versions >30 days old, so no release-age exclusion needed                                                                                                                                                                                                      |
| P0-16   | Hook ergonomics: lint-staged pre-commit                        | 2026-07-02 | [#12](https://github.com/WeaversMask/argus/pull/12) | lint-staged 17.0.8 (first dep under the ADR-0003 gate); staged-scope eslint + prettier --write with SKIP-aware `lint-staged.config.mjs`; gitleaks step unchanged, block re-verified. Detail: PR + handover                                                                                                                                                                                                                                                                   |
| P0-14   | pnpm 11 upgrade, minimum release age & install-script blocking | 2026-07-02 | [#11](https://github.com/WeaversMask/argus/pull/11) | pnpm 11.5.3 exact-pinned; `minimumReleaseAge: 4320` verified refusing a 1-day-old version; `allowBuilds: {}`; Node ≥22.13 (+`.nvmrc`); ADR-0003. Detail: PR + handover                                                                                                                                                                                                                                                                                                       |
| P0-15   | Agent workflow codification (CLAUDE.md + protocols)            | 2026-06-12 | [#9](https://github.com/WeaversMask/argus/pull/9)   | Root `CLAUDE.md` (context budget, permission-prompt policy); protocol gains plan-lands-first, reviewer step, parallel lanes, handover budget; Open-Decisions gate. Detail: PR + handover                                                                                                                                                                                                                                                                                     |
| P0-10   | Project license & third-party integration policy               | 2026-06-01 | [#7](https://github.com/WeaversMask/argus/pull/7)   | MIT `LICENSE` + aligned `package.json` field; ADR-0002 fixes the open-source posture (copyleft engines subprocess-only, no vendoring, no embedded Semgrep rules, Docker = recipe not published image, SPDX allowlist); audit of the current tree found **no** copyleft-of-concern. Folded into P0 to lock the integration boundary before Phase 4. P0-11/P0-12 follow.                                                                                                       |
| P0-05   | GitHub Actions CI pipeline                                     | 2026-05-25 | [#5](https://github.com/WeaversMask/argus/pull/5)   | Extended `ci.yml` with `typecheck` / `test` / `build` jobs running in parallel; `actions/cache@v4` per-job `.turbo` cache for warm-run speedup; `TURBO_TOKEN` / `TURBO_TEAM` / `TURBO_REMOTE_CACHE_SIGNATURE_KEY` env vars pre-wired at workflow level so remote cache flips on with a secrets-only change once D-1 lands; aggregated Vitest coverage uploaded as workflow artefact (14-day retention). Branch protection still needs a repo admin to enable required checks |
| P0-04   | Vitest test infrastructure                                     | 2026-05-25 | [#4](https://github.com/WeaversMask/argus/pull/4)   | Vitest 4.1.7 + @vitest/coverage-v8; first persistent workspace package `@argus/testing` with `defineProjectConfig`, `fakeSecret()`, and `toBeNonEmpty` custom matcher; root `vitest.config.ts` runs all projects in one invocation with aggregated coverage at 85% line / 80% branch thresholds                                                                                                                                                                              |
| P0-03   | ESLint + Prettier + commitlint + gitleaks                      | 2026-05-24 | [#3](https://github.com/WeaversMask/argus/pull/3)   | ESLint 10 flat config, Prettier 3.8, commitlint 21 (conventional), Husky 9, gitleaks 8.30.1 via repo-local .bin/; CI workflow with lint/format/commitlint/secret-scan jobs                                                                                                                                                                                                                                                                                                   |
| P0-02   | Base TypeScript configuration                                  | 2026-05-23 | [#2](https://github.com/WeaversMask/argus/pull/2)   | TS 6.0.3 pinned; tsconfig.base.json with strict + verbatimModuleSyntax; "no any in linter" deferred to P0-03 (delivered)                                                                                                                                                                                                                                                                                                                                                     |
| P0-01   | Initialise monorepo with pnpm workspaces + Turborepo           | 2026-05-23 | [#1](https://github.com/WeaversMask/argus/pull/1)   | pnpm 9.15.9 pinned; turbo 2.x; workspace:\* smoke-tested                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

## Open Decisions

> Decisions awaiting a human architect. Agents pick another task while waiting.

| ID  | Question                                                                                             | Raised by       | Raised on  | Options                                                                                                                                          | Recommendation                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D-1 | Turbo remote cache: Vercel Remote Cache (hosted) or self-hosted (e.g. `turborepo-remote-cache` OSS)? | claude-opus-4-7 | 2026-05-25 | (a) Vercel Remote Cache — set `TURBO_TOKEN` + `TURBO_TEAM` secrets and we're done; (b) self-hosted Docker image, more control, no vendor lock-in | (a) Vercel for speed-to-ship; revisit if free-tier limits bite. P0-05 wires the env vars so flipping the secrets on is the only follow-up. |

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
- [ADR-0002 — Third-party integration & open-source licensing policy](./adr/0002-third-party-integration-and-licensing-policy.md) — Accepted 2026-06-01
- [ADR-0003 — Supply-chain hardening baseline](./adr/0003-supply-chain-hardening-baseline.md) — Accepted 2026-07-02

---

## Notes for Agents

- The phase file at the link above contains every task you need for the current phase. **Do not load other phase files** unless doing explicit cross-phase work.
- If you finish a phase, update the "Current phase" field above and the next picker will load the next phase file.
- For PR template, see [`plan/templates/PR.template.md`](./plan/templates/PR.template.md).
