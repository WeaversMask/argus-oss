# Handover — P0-10 → P0-11

**From:** claude-opus-4-8
**To:** next picker
**Date:** 2026-06-01
**Phase:** P0 — Foundation
**Last task completed:** P0-10 — Project license & third-party integration policy

---

## Context

This is the **open-source licensing arc**. The maintainer decided to publish Argus as a **public, source-only repo for others to read and reuse — not sold, not hosted.** Because Argus delegates heavy work to OSS engines, two of which are copyleft (TruffleHog AGPL-3.0, Semgrep engine LGPL-2.1), the integration boundary has to be settled **before** Phase 4 writes any adapter code. That posture is now locked in [`ADR-0002`](./adr/0002-third-party-integration-and-licensing-policy.md) — **read it first; it is the governing contract for everything below.** The arc was split into three small P0 tasks: **P0-10** (the policy + license + ADR — _done, this session_), **P0-11** (notices, README prerequisites, contributor guardrail, doc-consistency edits — _next_), **P0-12** (the SPDX-allowlist CI/local guardrail — _after_).

P0-10 is committed (`1c30f3c`) but **not pushed and has no PR** (gh auth is broken on this box — see Gotchas). The branch `p0-10-license-and-policy-adr` sits on top of `p0-06-docker-dev-env`, **not** directly on `main` (see Gotchas #1 — this matters for how the PRs stack). Four decisions are **locked — do not re-litigate them**, the maintainer confirmed each: (1) **MIT** project license; (2) **three separate PRs** for the arc; (3) **`license-checker` (npm)** powers the P0-12 gate; (4) the SPDX allowlist is the permissive set **plus `BlueOak-1.0.0` and `Python-2.0`**, with **`MPL-2.0` / `lightningcss*` kept as a named, notice-preserved exception** (not blanket-allowed).

---

## What I Did

P0-10 — single commit `1c30f3c` (`chore(licensing): add MIT LICENSE and third-party integration policy (ADR-0002)`):

- **`LICENSE`** [created] — standard MIT text. Copyright line is **`Copyright (c) 2026 The Argus Authors`** — a **placeholder flagged for the maintainer** to replace with a preferred legal name (`TODO(licensing:)` in ADR-0002 References).
- **`package.json`** [modified] — `"license": "UNLICENSED"` → `"license": "MIT"`. ADR-0002 §E requires the `LICENSE` file and this field to always agree.
- **[`docs/adr/0002-third-party-integration-and-licensing-policy.md`](./adr/0002-third-party-integration-and-licensing-policy.md)** [created] — the policy. Sections **A–G** are non-negotiable, repo-wide, inherited by every later phase: (A) copyleft engines subprocess-only behind `ToolAdapter`, all external CLIs routed through that boundary; (B) no vendoring of binaries/source/rulesets; (C) Semgrep rules referenced/fetched, never embedded; (D) Docker is a recipe, no published baked-in image; (E) MIT; (F) `THIRD-PARTY-NOTICES` + README prerequisites; (G) SPDX allowlist self-audit. **The audit of the current tree lives in the ADR's Context** (not in gitignored `.work/`): `pnpm licenses list` found **no GPL/AGPL/LGPL/SSPL/Commons-Clause/Semgrep-Rules** present today; outliers are MPL-2.0×2 (`lightningcss`, `lightningcss-darwin-arm64`, dev-only transitive), BlueOak-1.0.0×5, Python-2.0×1 (`argparse`). The posture is therefore **preventive**.
- **[`docs/adr/0001-monorepo-with-pnpm.md`](./adr/0001-monorepo-with-pnpm.md)** [modified] — added a back-link to ADR-0002 under "Related ADRs".
- **[`docs/risks.md`](./risks.md)** [modified] — R-006 mitigation now points to the SPDX gate (P0-12) + ADR-0002; **added R-011** (copyleft engine linked/vendored instead of subprocessed; L/H; mitigated by ADR-0002 + CONTRIBUTING guardrail + license gate + adapter contract tests).
- **[`docs/plan/phases/phase-00-foundation.md`](./plan/phases/phase-00-foundation.md)** [modified] — wrote full task specs for **P0-10, P0-11, P0-12**; bumped exit criteria "9 tasks" → "12 tasks".
- **[`docs/IMPLEMENTATION.md`](./IMPLEMENTATION.md)** [modified] — P0-10 → Recently Completed; progress "6 of 12"; P0-11/P0-12 added to Up Next; ADR-0002 added to Recent ADRs.

PRs in this session:

- _none opened_ — branch `p0-10-license-and-policy-adr` is committed locally only (gh auth broken).

---

## What I Did NOT Do (Deferred)

> The whole point of the pause. P0-11 and P0-12 are **specified but not implemented**.

- **P0-11 (next task) — nothing started.** Deferred deliberately to keep PRs small and to let the maintainer confirm direction. Full spec in [`phase-00-foundation.md`](./plan/phases/phase-00-foundation.md) §[P0-11]. Concrete steps below in Recommended Next Steps.
- **P0-12 — nothing started.** SPDX-allowlist guardrail. Spec in §[P0-12]. **Soft-blocked on P0-07** (the CI audit job it's meant to "sit beside" — see Open Questions; P0-07 is _not_ done yet).
- **PR not opened for P0-10.** gh auth broken on this machine — every prior handover hit the same wall. Branch must be pushed and the PR opened from the GitHub UI by a human.
- **Copyright holder not finalised.** `LICENSE` says "The Argus Authors" — placeholder. Needs maintainer's real legal name. Tracked as `TODO(licensing:)` in ADR-0002.
- **P0-06 (Docker) still unstarted.** The `p0-06-docker-dev-env` branch contains **only** the P0-07 plan-insertion commit (`52b9f8e`) — no `Dockerfile.dev`, no `docker-compose.yml` yet. The full P0-06 recipe/plan is preserved in [`docs/handovers/p0-05-ci-pipeline-handover.md`](./handovers/p0-05-ci-pipeline-handover.md) (archived this session). Not part of the licensing arc; flagged only so it isn't lost.
- **Did not touch any phase-04/09/11 docs.** ADR-0002 §"Impact on existing plan docs" lists edits (e.g. P4-03 "bundles default rule pack" contradicts §C) that are **explicitly P0-11's job**, not P0-10's. Left untouched on purpose.

---

## Gotchas & Surprises

1. **Branch base is `p0-06`, NOT `main`.** Topology: `main (17d113b)` → `52b9f8e` (P0-07 plan-insertion, tip of `p0-06-docker-dev-env`) → `1c30f3c` (P0-10, current HEAD). I branched P0-10 off the `p0-06` tip because the P0-07 plan commit lives **only** there, and phase-00/IMPLEMENTATION.md reference P0-07 — basing on `main` would have produced an incoherent phase doc. Consequence: `git log main..HEAD` shows **two** commits (P0-07 plan + P0-10). When opening PRs, either (a) get `p0-06`'s plan commit onto `main` first, or (b) open P0-10's PR with base `main` and accept it carries the P0-07 plan commit too. Decide before pushing — see Open Questions.
2. **Prettier reformats Markdown tables and will fail CI if you don't pre-format.** `pre-commit` runs `prettier --check .` over the whole tree. Every time you edit a Markdown table (risks.md, IMPLEMENTATION.md, phase docs) Prettier wants to reflow it. **Run `npx prettier --write <files>` before `git add`** or expect a red `format:check`. This has bitten every doc-heavy task in this phase (noted in the P0-05 handover too).
3. **`.work/` is gitignored.** I kept a `.work/P0-10.md` task file; it is correctly absent from the commit. Don't try to commit task working files — and don't put deliverables there (that's why the tree audit lives in ADR-0002's Context, which _is_ committed).
4. **The arc is three PRs by maintainer decision.** Don't fold P0-11 + P0-12 into one PR to "save time" — granularity was explicitly chosen. One task, one branch, one PR.
5. **MPL-2.0 is a named exception, not an allowlist entry.** When you write the allowlist (P0-12) and the notices (P0-11), `lightningcss`/`lightningcss-darwin-arm64` must be handled as a **reviewed, notice-preserved exception** — any _new_ MPL-2.0 dep must still trip the gate. The maintainer was explicit: "allow BlueOak and Python but don't disregard the license notices." THIRD-PARTY-NOTICES must preserve notices for **every** license, permissive included.
6. **No `--no-verify`, ever.** gitleaks/lint/commitlint hooks must pass. Conventional-commit types are limited to `feat|fix|chore|refactor|docs|test` (see `commitlint.config.cjs`). Doc-only work → `docs(...)`; the licensing chore → `chore(licensing): ...`.

---

## State of the System

- ✅ `git status`: clean except the one untracked archive file this handover commit will pick up.
- ✅ P0-10 committed (`1c30f3c`), all Husky hooks passed (ESLint clean, Prettier clean, gitleaks "no leaks found").
- ✅ Tests unchanged: 9 passing in `@argus/testing` (100% on the only package with sources). P0-10 added no code.
- ✅ `pnpm lint` / `format:check` / `typecheck` / `build` were green at commit time (no source touched since).
- ⏸ CI: **not run** on this branch — nothing pushed yet.
- ⏸ Branch protection: still not enabled (pending admin since P0-03). The P0-12 license job and P0-07 audit job are both planned as **non-blocking / not-required** until that same admin step.
- ⏸ Dogfood scan: N/A until Phase 2.

---

## Recommended Next Steps

Pick up **P0-11 — Third-party notices, prerequisites & contributor guardrail** (deps: P0-10 ✅, fully unblocked) in this order:

1. **Read [`ADR-0002`](./adr/0002-third-party-integration-and-licensing-policy.md) end to end** — it _is_ the spec. Note §C (Semgrep rules) and the "Impact on existing plan docs" list.
2. Re-read [`phase-00-foundation.md`](./plan/phases/phase-00-foundation.md) §[P0-11] for the exact outputs/acceptance.
3. **Generate `THIRD-PARTY-NOTICES`** from the dependency tree, notices preserved for **every** license incl. the MPL-2.0 `lightningcss*` exception. `license-checker` isn't installed until P0-12, so either use `pnpm licenses list` (built in) to enumerate, or add a notices generator. Note the soft circular feel between P0-11 (needs notices) and P0-12 (adds the tool) — `pnpm licenses list --json` is enough to do P0-11 without pulling P0-12 forward.
4. **Create root `README.md`** with an **"External tools / Prerequisites"** section: each external tool, that the **user installs it separately**, and its license — TruffleHog **AGPL-3.0**, Semgrep **LGPL-2.1**, osv-scanner **Apache-2.0**, jscpd **MIT**, Prettier **MIT**, Tree-sitter **MIT**. State source-only / not-sold / not-hosted. **Re-verify each tool's current license** before writing it down (ADR-0002 References flags that licenses change between versions — don't copy mine on faith).
5. **Add `CONTRIBUTING.md`** guardrail + a licensing principle in [`00-principles.md`](./plan/00-principles.md) + a gate in [`quality-gates.md`](./plan/protocols/quality-gates.md): forbid vendoring copyleft tools/binaries/Semgrep rules; require every new dependency to pass the allowlist.
6. **Doc-consistency edits** (per ADR-0002 "Impact" list): in [`phase-04-tool-adapters.md`](./plan/phases/phase-04-tool-adapters.md) reword **[P4-03]** away from "bundles default rule pack (OWASP Top 10)" → runtime-fetch / BYO / Opengrep / first-party, and clarify copyleft engines are subprocesses not linked libs; flag the Docker-Hub/GHCR publish steps in [`phase-09`](./plan/phases/phase-09-ci-integrations.md) and [`phase-11`](./plan/phases/phase-11-hardening.md) with `TODO(licensing:)` per §D.
7. Update [`IMPLEMENTATION.md`](./IMPLEMENTATION.md), rotate this `HANDOVER.md` (archive to `docs/handovers/p0-10-...` first), commit `docs(...)`, push, human opens PR.

Estimated effort: **S** (per the phase doc — but it's doc-spread across many files; budget for the Prettier dance).

---

## Open Questions for the Next Agent

- **How should the three licensing PRs stack on the git tree?** P0-10 currently sits on `p0-06`, which carries an unmerged P0-07 plan commit. Cleanest is probably: land `p0-06`'s plan commit (or P0-06 itself) on `main`, then rebase the licensing branches onto `main`. Confirm with the maintainer before pushing — this is a tree-shape decision, not a code one. (Blockers belong in IMPLEMENTATION.md → Open Decisions if it turns into one.)
- **P0-12's P0-07 dependency.** P0-12 is specified to add a `license` CI job "beside" the P0-07 `audit` job — but **P0-07 isn't done**. Options: do P0-07 first (it's XS, ~10 lines of YAML), or add the `license` job standalone now and let P0-07 join it later. Doesn't block **P0-11** at all.
- **Copyright holder string.** "The Argus Authors" in `LICENSE` is a placeholder — the maintainer may want a real legal name before the repo goes public.
- **Spec-doc home.** ADR-0002 notes there's no committed canonical "spec doc"; the design surface is the phase docs + `01-repo-structure.md` + `00-principles.md`. If a canonical spec is ever added, fold the posture into it (`TODO(licensing:)`).
- **Notices generator choice.** `pnpm licenses list` vs a dedicated tool (`generate-license-file`, `license-checker-rseidelsohn`). Whatever you pick for P0-11, keep it consistent with the `license-checker` choice already locked for P0-12.

---

## Files Touched This Session

```
LICENSE                                                          [created  — committed 1c30f3c]
package.json                                                     [modified — committed 1c30f3c]
docs/adr/0002-third-party-integration-and-licensing-policy.md    [created  — committed 1c30f3c]
docs/adr/0001-monorepo-with-pnpm.md                              [modified — committed 1c30f3c]
docs/risks.md                                                    [modified — committed 1c30f3c]
docs/plan/phases/phase-00-foundation.md                          [modified — committed 1c30f3c]
docs/IMPLEMENTATION.md                                           [modified — committed 1c30f3c]
.work/P0-10.md                                                   [created  — gitignored, not committed]
docs/handovers/p0-05-ci-pipeline-handover.md                     [created  — archive of prior HANDOVER]
docs/HANDOVER.md                                                 [modified — this file, rewritten for P0-11]
```

---

## Sign-off

P0-10 is committed and the tree is clean and green; the licensing posture is locked in ADR-0002. The next picker can start P0-11 immediately against that contract — no further setup, just confirm the PR-stacking question before pushing.

— claude-opus-4-8
