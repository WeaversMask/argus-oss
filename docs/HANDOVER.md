# Handover — P0-16 → P0-11

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-02
**Phase:** P0 — Foundation
**Last task completed:** P0-16 — Hook ergonomics: lint-staged pre-commit

---

## Context

The hardening arc is complete: pnpm 11.5.3 + 3-day release-age gate + blocked dep scripts (P0-14, [ADR-0003](./adr/0003-supply-chain-hardening-baseline.md)), and the pre-commit hook is now staged-scope with Prettier auto-fix (P0-16) — the "Prettier dance" that bit every doc task is dead. lint-staged 17.0.8 was the first dependency added under the new gate (12-day-old version, passed cleanly; a 1-day-old version was refused in P0-14's negative test).

**Next: P0-11 — the licensing arc resumes.** Non-negotiable first step: read the [archived P0-10 handover](./handovers/p0-10-license-policy-handover.md) — it carries the arc's full context (locked decisions, MPL-2.0 exception handling, notices requirements). The P0-10 _work_ is done and merged (#7/#10); only its follow-up tasks P0-11/P0-12 remain. ADR-0002 is the governing contract.

---

## What I Did

- `lint-staged@17.0.8` exact-pinned (name/repo verified; published 2026-06-20). [`lint-staged.config.mjs`](../lint-staged.config.mjs) is SKIP-aware — `SKIP=lint` / `SKIP=format` drop the matching task inside one lint-staged invocation; JSON config couldn't do that, which is why it's not in package.json (overrides the previous handover's lean, documented).
- [`.husky/pre-commit`](../.husky/pre-commit) rewritten: lint-staged (ESLint check-only + `prettier --write` with auto-restage) → gitleaks staged scan **last**, so it scans post-Prettier content. `SKIP=` contract and gitleaks block unchanged.
- Verified acceptance matrix with scratch commits (all removed): drift auto-formats (5→3 lines committed); `SKIP=format` preserves drift; `SKIP=lint` bypasses a staged lint error that otherwise blocks; a high-entropy fake AWS key is blocked (`leaks found: 1`).
- Protocol amendment (maintainer-approved 2026-07-02): review passes run on a **cost-efficient model** by default (Sonnet-class); escalate only for high-risk diffs. In `agentic-execution.md` §Task Completion Checklist.

---

## What I Did NOT Do (Deferred)

- **P0-11, P0-07, P0-12, P0-13, P0-06, P0-08, P0-09** — unstarted, in Up Next order.
- **Dependabot alerts (vite/js-yaml):** fixed after this handover was written — [PR #13](https://github.com/WeaversMask/argus/pull/13) pins vite 8.0.16 / js-yaml 4.2.0 via range-scoped `overrides` in `pnpm-workspace.yaml` (`pnpm update` can't reach non-direct transitives; both patched versions were >30 days old, so no SECURITY-NOTES §5 exclusion was needed). Remove each override once dependents lock past the pinned version.
- **Maintainer decisions still open:** D-1 (remote cache), copyright/identity + `nvm alias default 22` (Node 22.23.1 installed, default still 20).

---

## Gotchas & Surprises

1. **gitleaks quietly ignores "fake-looking" secrets** — two layers: AWS's documented example key (`AKIAIOSFODNN7EXAMPLE`) is allowlisted by default, and the AWS rule has an **entropy threshold**, so low-entropy strings like `AKIAZZZ...` pass. When testing secret detection, use a random-looking key. (Cost me two failed test rounds.)
2. **Scratch-test commits: commit the real work FIRST, then test, then `git reset --soft HEAD~1` + scoped `git restore --staged`.** I used `reset --hard` with uncommitted work in the tree and wiped my own changes once — don't repeat that.
3. **ESLint on staged files is check-only by design** (`--max-warnings=0`, no `--fix`) — auto-fixing lint findings mutates logic-adjacent code silently; Prettier auto-fix is safe.
4. Everything from the P0-14 handover still applies: Node 22 (`nvm use`), `pnpm add` needs `-w` at root, dep additions need a ≥3-day-old version.

---

## State of the System

- ✅ Tests: 9 passing, 100% line/branch; lint/format/typecheck/build green (Node 22 + pnpm 11.5.3)
- ✅ Hooks: new pre-commit verified end-to-end incl. gitleaks block; commit-msg unchanged
- ⏸ This task's PR: open, pending human merge
- ⏸ Dogfood scan: N/A until Phase 2

---

## Recommended Next Steps

Pick up **P0-11 — Third-party notices, prerequisites & contributor guardrail** (branch from `main` after this PR merges):

1. Read the [archived P0-10 handover](./handovers/p0-10-license-policy-handover.md) §Recommended Next Steps — it contains the complete P0-11 recipe (notices via `pnpm licenses list --json`, README prerequisites with re-verified tool licenses, CONTRIBUTING guardrail, phase-04/09/11 doc-consistency edits). Follow it; the locked decisions there are still binding.
2. Also read [ADR-0002](./adr/0002-third-party-integration-and-licensing-policy.md) end to end — it is the spec.
3. Note what has changed since that handover was written: gh auth **works** (push + `gh pr create` fine; merge is human-only), branch protection is live, Prettier auto-fixes at commit time now, and any tooling the notices generation needs must respect the release-age gate.
4. Tracker + handover rotation, PR with a **Sonnet review packet** (per the new protocol line).

Estimated effort: **S** (doc-spread; the Prettier pain it warned about is now gone).

---

## Open Questions for the Next Agent

- `THIRD-PARTY-NOTICES` generation: `pnpm licenses list --json` output changed shape between pnpm 9 and 11 — verify the fields before scripting against it.

---

## Files Touched This Session

```
package.json                                     [modified — lint-staged 17.0.8]
pnpm-lock.yaml                                   [modified — lint-staged + transitives]
lint-staged.config.mjs                           [created — SKIP-aware config]
.husky/pre-commit                                [rewritten — staged-scope + gitleaks last]
docs/plan/protocols/agentic-execution.md         [modified — reviewer model-tier line]
docs/IMPLEMENTATION.md                           [modified — 9/16, PR links]
docs/HANDOVER.md                                 [rewritten — this file]
docs/handovers/p0-14-pnpm11-hardening-handover.md [created — archive]
.work/P0-16.md                                   [created — gitignored]
```

---

## Sign-off

Hook chain verified end-to-end with live scratch commits (auto-fix, SKIP contract, secret block); tree green; P0-11 has a complete recipe waiting in the archived handover.

— claude-fable-5
