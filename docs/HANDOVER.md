# Handover — Showcase README (DOC-02)

**From:** claude-opus-5
**To:** next picker (Phase 2 continues — M1 showcase tail)
**Date:** 2026-08-01
**Phase:** P2 — MVP (5/6+5) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** DOC-02 — Showcase README — **PR open, awaiting maintainer merge**

---

## Context

P2-06 and the CLAUDE.md background-process guard merged ([#39](https://github.com/WeaversMask/argus-oss/pull/39), [#40](https://github.com/WeaversMask/argus-oss/pull/40)) before this session started, but neither carried its bookkeeping tail — two Recently Completed rows still read `_pending_`, the tracker still said "awaiting merge", and `HANDOVER.md` had never been snapshotted. That close-out is the first commit on this branch; the rest is DOC-02.

**Rebased onto OPS-06** ([#42](https://github.com/WeaversMask/argus-oss/pull/42), the THIRD-PARTY-NOTICES drift gate), which merged first and rewrote both tracker files — the parallel-lane case the protocol anticipates. OPS-06 itself came out of DOC-02's independent review: the README's license receipt claimed notices were regenerated and diffed on every change, and nothing checked. Its handover is archived at [`docs/handovers/ops-06-notices-drift-gate-handover.md`](./handovers/ops-06-notices-drift-gate-handover.md) — read it before touching `scripts/`, since the live `HANDOVER.md` you are reading replaced it in the rotation.

The README top is now M1's recruiter tier instead of a Phase-0 pre-alpha notice that had been false since P2-02. **Three of the four M1 criteria that need agent work are still open: DOC-03 (workflow showcase), DOC-04 (developer tour), OPS-05 (go-public sweep).** P2-05 (diff mode) is the last numbered P2 task but is not itself a phase exit criterion and blocks nothing — the tracker's Up Next now ranks the M1 tail ahead of it, which is a re-ranking a later picker may reverse if the maintainer prefers.

## What I Did

- **Closed out P2-06/DOGFOOD bookkeeping** (own commit): archived the P2-06 handover to `docs/handovers/`, filled in the #39/#38 PR links, corrected header/Phase Status/Up Next to post-merge reality.
- **Rewrote the top of `README.md`** in DOC-02's specced order. Everything below the fold (posture, external tools, dev setup, Docker, license) kept its content.
- **`docs/assets/argus-self-scan.svg`** — the committed terminal demo, two frames, generated from real captured CLI output.
- **Root `argus` script** in `package.json` — one line, so `pnpm -s argus check .` is a real command (see Gotcha 2).
- **Re-measured every tracker metric** rather than copying it forward; found and corrected two stale numbers and one broken CI job (Gotchas 3 and 4).

PRs merged in this session: none — this branch's PR is open and awaiting the maintainer.

## What I Did NOT Do (Deferred)

- **Badges (CI, coverage, mutation, license).** These are explicitly **OPS-05's** listed output, not DOC-02's, and a mutation badge would currently be red (Gotcha 4). Deliberately left out; OPS-05 should place them.
- **DOC-03 / DOC-04.** Untouched. DOC-03 was specced as "polish after DOC-02 framing settles" — that framing is now settled, so it is the natural next pick.
- **The failing weekly Stryker job.** Diagnosed only as far as "failing since 2026-07-28, logs expired". Needs its own task (Gotcha 4).
- **`argus explain` still doesn't report fixability** — inherited gap from P2-06, still flagged in `docs/guide/cli.md`, still small.

## Gotchas & Surprises

1. **`node_modules` can silently predate a merged branch.** After pulling #39, `argus check` died with `ERR_MODULE_NOT_FOUND: '@argus/adapters-prettier'` — the new nested workspace package had never been linked locally. `pnpm install --frozen-lockfile` fixes it. Worth doing reflexively after any pull that adds a package.

2. **`pnpm <script>` is not transparent, and that nearly shipped a false demo.** Plain `pnpm argus check .` echoes `$ node apps/cli/bin/argus.mjs check .` before the output **and** appends `[ELIFECYCLE] Command failed with exit code 1.` whenever argus exits non-zero — i.e. on every run that finds something. A demo frame showing clean output under that command would have been fabricated. `pnpm -s` suppresses both and still propagates the real exit code (verified: 0 clean, 1 with violations). **Use `pnpm -s` in any doc that shows argus output.**

3. **Re-measure, never copy forward.** The tracker's standing "569 third-party packages" was actually **563**, and the self-scan file count had moved 147 → 149. Both had been carried across sessions unverified. Every number in the new README was produced by running the thing in this session; the Metrics Snapshot now says when it was measured.

4. **A report-only CI job can fail silently for weeks.** The weekly Stryker mutation workflow has failed since **2026-07-28** ([run 30363247769](https://github.com/WeaversMask/argus-oss/actions/runs/30363247769)); because it gates nothing, nobody noticed, and the 85.74% score kept being cited as current. Its logs have already expired, so diagnosis starts from scratch — first suspect is config globs that predate `packages/api-contracts` and the nested `packages/adapters/*` (the same single-segment-path assumption that bit dependency-cruiser in P2-06, Gotcha 3 of the previous handover). **Do not cite that number until the job is green.**

5. **Write the claim, then go check it.** Two sentences in the first README draft were wrong in exactly the way the M1 "every claim verifiable" bar exists to catch: coverage thresholds are aggregate at the root `vitest.config.ts`, not enforced per package; and cross-family review is "wherever the roster allows", not absolute — P2-04's reviewer was same-family as its author. Both were caught by opening the file rather than by trusting the draft. Anything in a receipts table is a promise that someone will click it.

## State of the System

- ✅ Tests: **737 passing** (70 files), coverage 97.84 lines / 94.26 branches / 99.77 functions / 97.91 statements
- ✅ Lint, typecheck, build, format:check, boundaries (248 modules / 847 deps), license-check (563 pkgs) — all green at root
- ✅ Self-scan: `pnpm -s argus check .` → **0 violations, 0 failures, 149 files**
- ✅ `pnpm -s argus check . --format json` and `pnpm -s argus explain <rule-id>` both verified working as the README documents them
- ⚠️ **Weekly Stryker mutation job red since 2026-07-28** — report-only, gates nothing, needs its own task (Gotcha 4)
- ⚠️ Two pre-existing flaky tests under full-suite parallel load (`@argus/ast` parse benchmark, `@argus/cli` `bin.test.ts`) — inherited from P2-06, both passed in both full runs this session
- ⬜ Awaiting the maintainer's merge decision — agents never merge

## Recommended Next Steps

1. **DOC-03 — workflow showcase** (`docs/workflow.md`). Its dependency was DOC-02's framing, which is now settled. The receipts table in the new README top is the shortlist of guardrails to expand on, and its links are already verified — reuse them rather than re-sourcing.
2. **DOC-04 — developer tour** (`docs/dev/tour.md`), then **OPS-05** last (it re-verifies everything else, including placing the badges DOC-02 left out).
3. **P2-05 (diff mode)** whenever the maintainer wants the last numbered task; nothing in Phase 2 waits on it.

Estimated effort: DOC-03 **M**, DOC-04 **S**, OPS-05 **S**.

## Open Questions for the Next Agent

- Is re-ranking Up Next (M1 tail ahead of P2-05) the right call? It follows the maintainer's M1 directive and the phase exit criteria, which do not name P2-05 — but P2-05 had been listed first since the phase opened.
- The receipts table is six rows. Does a seventh (determinism/no-AI-in-the-scan-path) belong, and what would its _receipt_ be? It is the strongest product claim in the README and currently the only one carried by prose alone.

Carried forward from OPS-06, still open:

- Should `scripts/` get a test project? Three CI-relevant scripts now have zero automated coverage. It is a small vitest project plus fixtures, and it would let the drift check's fail-closed paths be regression-tested rather than hand-verified once.
- Should `notices:check` join the pre-push hook? It costs ~3s and would catch drift before CI, at the price of slowing every push.

## Files Touched This Session

```
docs/handovers/p2-06-autofix-engine-handover.md  [created — rotation snapshot]
docs/handovers/ops-06-notices-drift-gate-handover.md  [created — rotation snapshot, at rebase]
docs/IMPLEMENTATION.md                           [modified — close-out, DOC-02 row, metrics]
docs/HANDOVER.md                                 [rewritten — this file]
README.md                                        [rewritten above the fold]
docs/assets/argus-self-scan.svg                  [created — terminal demo]
package.json                                     [modified — root `argus` script]
```

## Sign-off

All gates green, self-scan clean, and every number and link in the new README was verified in this session rather than inherited. The next picker can start DOC-03 immediately.

— claude-opus-5
