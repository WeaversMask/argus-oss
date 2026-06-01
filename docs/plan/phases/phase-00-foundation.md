# Phase 0 — Foundation & Tooling

> **Self-contained phase doc.** Everything needed to execute Phase 0 is here.
> When done, update [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md) → set Current Phase to P1 and load [`phase-01-domain-core.md`](./phase-01-domain-core.md).

**Duration:** ~2 weeks
**Demoable:** No — pure infrastructure
**Prerequisites:** None (this is the seed phase)

---

## Goal

A clean monorepo with CI, linting, formatting, type checking, testing, and Docker, ready for feature development. A new contributor (or agent) can clone, run `pnpm install && pnpm test`, and have everything pass.

---

## Tasks

### [P0-01] Initialise monorepo with pnpm workspaces + Turborepo

- **Deps:** none
- **Outputs:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, empty `apps/` and `packages/` folders
- **Acceptance:**
  - `pnpm install` succeeds
  - `pnpm turbo run build` is wired (no-op acceptable)
  - Workspace packages can reference each other (`workspace:*`)
- **Effort:** S

### [P0-02] Base TypeScript configuration

- **Deps:** P0-01
- **Outputs:** `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`; per-package `tsconfig.json` extending base
- **Acceptance:**
  - `pnpm typecheck` runs across all packages
  - No `any` types pass the linter
- **Effort:** S

### [P0-03] ESLint + Prettier + commitlint + gitleaks

- **Deps:** P0-02
- **Outputs:**
  - `eslint.config.js` (flat config)
  - `.prettierrc`
  - `commitlint.config.js`
  - `.gitleaks.toml` configuration with allowlist for test fixtures under `tests/fixtures/secret-detection/`
  - Husky hooks:
    - `pre-commit`: lint + format check + **gitleaks scan of staged changes**
    - `commit-msg`: commitlint validation
  - CI workflow includes `gitleaks` full-history scan on every PR
- **Acceptance:**
  - Lint, format, commit message validation, and secret scanning all run as git hooks
  - Attempting to commit a string matching a known secret pattern (test with a fake AWS key in a non-fixture file) is **blocked**
  - CI runs the same checks
  - `SKIP=gitleaks` env var allows override for rare legitimate cases (documented in `docs/SECURITY-NOTES.md`)
- **Effort:** S

### [P0-04] Vitest test infrastructure

- **Deps:** P0-02
- **Outputs:** Shared Vitest config in `packages/testing`, coverage thresholds set to 85% line / 80% branch
- **Acceptance:**
  - `pnpm test` runs across all packages
  - Coverage report aggregates monorepo-wide
  - Custom matchers can be imported from `@argus/testing`
- **Effort:** M

### [P0-05] GitHub Actions CI pipeline

- **Deps:** P0-03, P0-04
- **Outputs:** `.github/workflows/ci.yml` running lint → typecheck → test → build on every PR and main push
- **Acceptance:**
  - Pipeline runs under 10 minutes on a typical change
  - Turbo cache hits are used (remote cache via Vercel Remote Cache or self-hosted)
  - Failed PRs blocked from merge via branch protection
- **Effort:** M

### [P0-06] Docker development environment

- **Deps:** P0-01
- **Outputs:** `Dockerfile.dev`, `docker-compose.yml` for local dev with Redis (for BullMQ later) and Postgres (for later)
- **Acceptance:**
  - `docker compose up` brings up dev environment
  - Volumes mounted so file edits propagate
- **Effort:** S

### [P0-07] Lightweight dependency audit in CI

- **Deps:** P0-05
- **Outputs:** New `audit` job in `.github/workflows/ci.yml` running `pnpm audit --audit-level=high` on every PR, every push to `main`, and on a weekly schedule (`cron: '0 12 * * 1'`)
- **Acceptance:**
  - Job runs in parallel with the existing CI jobs; no impact on critical-path lint/typecheck/test/build wall time
  - Fails the workflow only on **high or critical** advisories — moderate-and-below do not block PRs (avoids noise from transitive dev-dep churn)
  - Scheduled weekly trigger re-audits pinned versions so advisories disclosed between PRs are still surfaced
  - Job is **not** added to branch-protection required checks (deferred to the same admin step pending for the other jobs since P0-03 — document in the PR)
- **Effort:** XS
- **Scope — explicit non-goal:** This is a stopgap. It catches the public-advisory subset of supply-chain risk that the npm registry indexes. It does **not** discharge `P11-02`'s dependency-audit obligation (typosquat detection, behavioural / install-script analysis, license review, threat-model alignment, external pen test). When P11-02 ships a more comprehensive tool, this job should be replaced or rolled into the replacement — do **not** remove it before then.
- **Rationale for slotting into P0:** Approved as a deviation from the original Phase-11-only plan in response to the 2026 npm supply-chain wave (Shai-Hulud, axios, node-ipc, @tanstack/\*, @antv/\*). Cost is ~10 lines of YAML; benefit is shift-left detection across the 12+ weeks of P1–P10 development.

### [P0-08] Documentation scaffolding

- **Deps:** P0-01
- **Outputs:** All `docs/` files already exist; verify they're in place and ADR-0001 documents the monorepo decision
- **Acceptance:**
  - PR template at `.github/PULL_REQUEST_TEMPLATE.md` matches [`templates/PR.template.md`](../templates/PR.template.md)
  - Issue templates created
  - ADR-0001 written
- **Effort:** S

### [P0-09] Changesets release workflow

- **Deps:** P0-05
- **Outputs:** `.changeset/` configured, release workflow in GitHub Actions
- **Acceptance:**
  - Running `pnpm changeset` opens an interactive prompt
  - Merging a release PR publishes packages to npm (or internal registry)
- **Effort:** S

### [P0-10] Project license & third-party integration policy

- **Deps:** none (foundational; relates to P0-07 / P0-08)
- **Outputs:** `LICENSE` (MIT); `package.json` `"license": "MIT"`; [`ADR-0002`](../adr/0002-third-party-integration-and-licensing-policy.md); risk-register updates (R-006, R-011)
- **Acceptance:**
  - `LICENSE` present (MIT) and the `package.json` license field agrees
  - ADR-0002 records the posture: copyleft engines (TruffleHog AGPL-3.0, Semgrep LGPL-2.1) are **subprocess-only**; no vendored binaries/source/submodules; no embedded Semgrep rules; Docker is a recipe (no published baked-in image); MIT project license; SPDX allowlist
  - Audit of the already-committed tree recorded in the ADR (no copyleft-of-concern present today)
- **Effort:** S
- **Rationale for slotting into P0:** Integrates the open-source publishing posture **before** Phase 4 writes any tool-integration code, so every later phase inherits the boundary. Source-only public repo; not sold, not hosted.

### [P0-11] Third-party notices, prerequisites & contributor guardrail

- **Deps:** P0-10
- **Outputs:** `THIRD-PARTY-NOTICES`; root `README.md` with an **"External tools / Prerequisites"** section; `CONTRIBUTING.md` guardrail; a licensing principle in [`00-principles.md`](../00-principles.md) + a gate in [`quality-gates.md`](../protocols/quality-gates.md); doc-consistency edits to phase-04 / phase-09 / phase-11
- **Acceptance:**
  - `THIRD-PARTY-NOTICES` generated from the dependency tree; notices preserved for every license (including permissive)
  - README lists each external tool, the fact the user installs it separately, and its license (TruffleHog AGPL-3.0, Semgrep LGPL-2.1, osv-scanner Apache-2.0, jscpd/Prettier MIT)
  - CONTRIBUTING + principles forbid vendoring copyleft tools/binaries/Semgrep rules and require every new dependency to pass the allowlist
  - [P4-03] reworded away from "bundles default rule pack" → runtime-fetch / BYO / Opengrep / first-party; Docker-publish flagged in phase-09 / phase-11 with `TODO(licensing:)`
- **Effort:** S

### [P0-12] License-compliance guardrail (SPDX allowlist) in CI + local script

- **Deps:** P0-10, P0-07 (CI audit job exists to sit beside)
- **Outputs:** `license-checker` dev-dependency; `scripts/check-licenses` + a `pnpm license-check` script; a new parallel `license` job in `.github/workflows/ci.yml`
- **Acceptance:**
  - `pnpm license-check` passes locally against the current tree (allowlist includes `BlueOak-1.0.0` + `Python-2.0`; `lightningcss` MPL-2.0 handled as a named, notice-preserved exception)
  - Any dependency whose license is outside the allowlist fails the check
  - CI job runs in parallel (no critical-path impact) and is **not** added to branch-protection required checks (same deferral pending since P0-03 — document in the PR)
- **Effort:** S
- **Scope — relationship to other tasks:** This is the **dev-tooling self-audit**, distinct from the planned [P4-06] `license-checker` _product adapter_ (a runtime feature). Like [P0-07], it is a Phase-0 shift-left guardrail; P11-02's comprehensive audit may later supersede it. Do not remove before then.

---

## Phase 0 Exit Criteria

- [ ] All 12 tasks complete and merged to `main`
- [ ] CI green
- [ ] A new contributor can clone, run `pnpm install && pnpm test`, all passes
- [ ] Phase handover written and archived

---

## Phase-Specific Notes

- **Read [`../../SECURITY-NOTES.md`](../../SECURITY-NOTES.md)** before your first commit. It defines what must never be committed and how the secret-scanning defences work.
- **pnpm version:** pin to a specific version via `packageManager` field in root `package.json`. Volatility in pnpm minor releases has bitten projects before.
- **Turborepo remote cache:** decide early. Self-hosted (with `turbo-cache` server) avoids vendor lock-in; Vercel-hosted is one-click.
- **Husky modern setup:** Husky v9+ uses a different config. Use the latest stable; older setup guides don't apply.
- **Don't add real source code yet.** Resist the urge to scaffold packages with placeholder code. Empty `package.json` files in workspace folders are fine for now.

---

## Definition of Done for Phase 0

The next agent should be able to:

1. Clone the repo
2. Run `pnpm install`
3. Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` — all green
4. Create a new branch, make a trivial change, open a PR, see CI run all checks
5. Start Phase 1 with no further setup
