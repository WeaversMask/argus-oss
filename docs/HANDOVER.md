# Handover — P0-13 → P0-06

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-04
**Phase:** P0 — Foundation
**Last task completed:** P0-13 — CI supply-chain hardening (plus OPS-02 review-tiering protocol change)

---

## Context

Two PRs opened this session on top of the merged P0-12 (#17): **OPS-02** ([#18](https://github.com/WeaversMask/argus/pull/18) — risk-tiered review passes, maintainer-requested token-cost reduction) and **P0-13** ([#19](https://github.com/WeaversMask/argus/pull/19) — this task). The P0-07 → P0-12 → P0-13 `ci.yml` serialization is complete; nothing in Up Next touches `ci.yml` next, so no branch-ordering constraint beyond waiting for #18/#19 to merge before rebasing doc edits. **Next: P0-06 — Docker development environment** (spec in [phase-00 §P0-06](./plan/phases/phase-00-foundation.md)); remember ADR-0002 §D — Docker is a **recipe**, never a published/redistributed image.

## What I Did

- **P0-13 (#19):** every `uses:` in `ci.yml` SHA-pinned with version comment (SHAs resolved from upstream repos via `gh api`, concrete tags matched: checkout v4.3.1, pnpm/action-setup v4.3.0, setup-node v4.4.0, cache v4.3.0, upload-artifact v4.6.2, gitleaks-action v2.3.9); new `.github/dependabot.yml` (github-actions + npm, grouped minor/patch, **cooldown 3 days = pnpm `minimumReleaseAge`**); CI Node pinned via workflow env `NODE_VERSION: "22.23.1"` replacing `node-version-file: package.json` in all 7 jobs; `scripts/install-gitleaks.sh` now verifies the tarball SHA-256 against embedded per-platform values from the release's checksums file (mismatch = hard exit 1; download failure stays soft-skip — deliberate availability/integrity split); `turbo.json` `remoteCache.signature: true` (inert until D-1).
- **OPS-02 (#18):** protocol's review bullet rewritten — light tier (bugs-only, no packet) for docs/config-only diffs; full packet only for executable-logic/security-relevant diffs; standing reviewer brief: diff-scoped, don't re-run author-documented verification, budget on untested paths. P0-13's review ran under the new brief.
- Tracker 13/16 (rows for both tasks live in #19 — single-writer rule).

## What I Did NOT Do (Deferred)

- **P0-06, P0-08, P0-09** — unstarted, in Up Next order.
- **`.nvmrc` left floating at `22`** (dev ergonomics; hooks have the floor guard). The concrete pin is CI-only. If the maintainer wants dev pinned too, that's a one-line change + note.
- **Dependabot config validates server-side only** — after #19 merges, check Insights → Dependency graph → Dependabot for config errors, and that the first update PRs respect the 3-day cooldown (acceptance item verifiable only post-merge).
- **Notices freshness check** — still deferred (recipe in [P0-12 handover](./handovers/p0-12-license-gate-handover.md)).
- **Maintainer decisions open:** D-1 (remote cache — `signature: true` + secrets are ready when decided); `LICENSE` copyright placeholder; `nvm alias default 22`.

## Gotchas & Surprises

1. **Action majors have moved on upstream** (checkout v7, setup-node v6, gitleaks-action v3…). The pins deliberately stay on the majors the workflow already used; Dependabot will now propose major bumps as individual PRs — review those against upstream breaking-change notes, don't auto-take.
2. **`NODE_VERSION` and `engines.node` are now two places** — bump together (comment in `ci.yml` says so). setup-node reads the env via `${{ env.NODE_VERSION }}`.
3. **gitleaks bump procedure changed:** changing `GITLEAKS_VERSION` now also requires refreshing the four embedded SHA-256 values from the new release's `gitleaks_<ver>_checksums.txt` (URL pattern in the script comment). The script will hard-fail if you forget — that's the point.
4. **pnpm 11 under nvm:** bare `pnpm` in fresh shells needs `source ~/.nvm/nvm.sh && nvm use --silent` first (nvm default is still Node 20).
5. **P0-12 gotchas remain live** (license-checker sees only direct deps under pnpm; exceptions are license-string-pinned): [archived handover](./handovers/p0-12-license-gate-handover.md).

## State of the System

- ✅ Tests 9 passing (100% line/branch), lint/format/typecheck green, `pnpm license-check` OK, `pnpm audit` clean
- ✅ install-gitleaks: positive (real download verified + installed in scratch) and negative (tampered hash → exit 1) both exercised locally
- ⏸ PRs #18 (OPS-02) and #19 (P0-13) open, pending human merge; CI expected green on #19 (docs-only #18 too)
- ⏸ Dogfood scan: N/A until Phase 2

## Recommended Next Steps

Pick up **P0-06 — Docker development environment** (branch from `main` after #18/#19 merge — #19 owns the tracker rows):

1. Read [phase-00 §P0-06](./plan/phases/phase-00-foundation.md) + ADR-0002 §D (recipe, not redistribution — no published image, no bundled engines).
2. Respect the supply-chain posture: pin base images by digest (matches the P0-13 SHA-pinning spirit), no curl-pipe-sh installs.
3. Tracker + handover rotation, review pass per the new OPS-02 tiering, PR.

## Open Questions for the Next Agent

- None new. Post-merge Dependabot config check (above) is the only follow-through from this session.

---

## Files Touched This Session

```
.github/workflows/ci.yml                 [modified — SHA pins, NODE_VERSION]   (P0-13, #19)
.github/dependabot.yml                   [created]                             (P0-13, #19)
scripts/install-gitleaks.sh              [modified — SHA-256 verification]     (P0-13, #19)
turbo.json                               [modified — remoteCache.signature]    (P0-13, #19)
docs/plan/protocols/agentic-execution.md [modified — review tiering]           (OPS-02, #18)
docs/IMPLEMENTATION.md                   [modified — 13/16, P0-13+OPS-02 rows] (P0-13, #19)
docs/HANDOVER.md                         [rewritten — this file]               (P0-13, #19)
docs/handovers/p0-12-license-gate-handover.md [created — archive]              (P0-13, #19)
.work/P0-13.md, .work/OPS-02.md          [created — gitignored]
```

## Sign-off

Supply-chain hardening is in place and negatively tested (tampered checksum blocks, mutable tags gone); review passes are cheaper by protocol from now on; tree green. P0-06 is next with a clean runway.

— claude-fable-5
