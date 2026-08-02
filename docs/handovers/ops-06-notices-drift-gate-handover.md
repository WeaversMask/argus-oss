# Handover — THIRD-PARTY-NOTICES drift gate (OPS-06)

**From:** claude-opus-5
**To:** next picker (Phase 2 continues)
**Date:** 2026-08-01
**Phase:** P2 — MVP (5/6+5) → Milestone M1 Showcase-Ready at phase end
**Last task completed:** OPS-06 — notices drift gate — PR open, awaiting maintainer merge

---

## Context

Found during the **DOC-02 independent review**: the README's license receipt claimed THIRD-PARTY-NOTICES was "regenerated and diffed on every change." It was not. The `license` job ran only `pnpm license-check`; neither husky hook ran `pnpm notices`; the only reference anywhere was the manual root script. DOC-02 removed the false claim. **This task makes the claim true instead**, so the several tracker rows that assert "notices regenerated, zero diff" (P2-06, the dogfooding row, P2-04, P2-02, P1-04, P1-03) finally sit on a mechanism.

This gap was known and deferred twice — the [P0-11 handover](./p0-11-third-party-notices-handover.md) §Gotcha 3 flagged platform variance, and P0-12 deferred the check again citing it. It is closed now.

## What I Did

- **`scripts/lib/installed-packages.mjs`** [new] — everything that touches pnpm/`node_modules`: license grouping, copyright extraction, the MPL-2.0 guard, and the platform split.
- **`scripts/lib/third-party-notices.mjs`** [new] — document rendering + `DRIFT_CHECK_BOUNDARY` / `portablePrefix`.
- **`scripts/generate-third-party-notices.mjs`** — now an 82-line CLI over those two, with a `--check` mode.
- **`pnpm notices:check`** (root script) wired into CI's `license` job.
- Docs: `CONTRIBUTING.md` guardrail #5, `quality-gates.md` license line, an ADR-0002 §F enforcement note.

### The design decision, and why

The generator's output was host-dependent in **two** ways, not one. The task brief named the first; the second only shows up on Linux.

1. **The `Snapshot:` line** carried the current date and the host platform. → **Removed from the file; the full provenance (date · pnpm · platform) now goes to stderr on every run.** This was the brief's option (a), and it is the right one: a self-reported date proves only that _someone ran the script_, whereas `git log -1 -- THIRD-PARTY-NOTICES` proves when the committed content actually changed and cannot be refreshed by a no-op rerun. The alternative — "diff only below the snapshot line" — keeps a line in the file that is knowably wrong the moment anyone else regenerates, makes the check structure-aware rather than dumb, and does nothing about (2), which is what actually breaks CI.

2. **Packages that declare `os`/`cpu`/`libc` resolve differently per host.** On darwin-arm64 that is four: `@rolldown/binding-darwin-arm64`, `@turbo/darwin-arm64`, `lightningcss-darwin-arm64`, `fsevents`. On linux-x64 CI the first three become their linux variants, **`fsevents` is not installed at all**, and **`@rollup/rollup-linux-x64-gnu` appears** — it is a linux-only optional dependency of `neverthrow`, invisible from a Mac. So both the membership _and the size_ of that set are host properties. Fixing only (1) still leaves a check that fails 100% of the time.

   **Three options were weighed. Dropping the four from the file (making a plain `git diff --exit-code` work) was rejected on the repo's own policy**: ADR-0002 §F says notices are never dropped, and `fsevents` carries `Copyright (C) 2010-2020 by Philipp Dunkel, Ben Noordhuis, Elan Shankar, Paul Miller` — held by no other package in the tree. Reconstructing the full per-platform families from the lockfile was rejected too: you cannot read a notice out of a package you never downloaded, so ~29 entries would have to claim "no copyright line" about packages nobody looked at.

   **Chosen:** the generator emits them into a trailing section under a fixed marker, and every count above that marker is computed from the portable set alone. `--check` compares the prefix and stops. So the file keeps full legal fidelity, and the check verifies everything that _can_ be verified across hosts.

**Detection is structural, not lexical** — a package is platform-scoped iff its own `package.json` declares `os`/`cpu`/`libc`. Name heuristics would have failed: `@turbo/linux-64` and `fsevents` share nothing with `lightningcss-darwin-arm64`.

**Why `--check` and not `pnpm notices && git diff --exit-code`:** the comparison has to know which region is comparable, and the only component that can know is the generator. Putting it in the YAML would mean a hand-maintained `sed`/ignore list in CI drifting from the file's actual structure. `--check` never writes, so a red CI job leaves nothing to clean up.

## What I Did NOT Do (Deferred)

- **README.md untouched — deliberately.** DOC-02 is in flight on `doc-02-showcase-readme` and rewrites the README's licensing receipt row. Once both land, that row can cite `pnpm notices:check` as the enforcing mechanism. Editing it from this branch would have created a pure conflict for no benefit.
- **No pre-commit/pre-push hook.** CI-only, per the brief. `pnpm notices:check` runs in ~3s locally if anyone wants it wired later.
- **No automated test for the scripts.** `scripts/` has no test harness (`check-licenses.mjs`, a CI gate since P0-12, has none either) and creating one is its own task. Verified by execution instead — eight cases, below. **This is the weakest part of the task; flagging it rather than burying it.**
- **`MPL_EXCEPTION` still duplicated** between `installed-packages.mjs` and `check-licenses.mjs`, with the "keep in sync" comment both files already carried. Unifying them is a separate change.

## Gotchas & Surprises

1. **The brief's complication was half the problem.** The snapshot line is the visible one; the platform-scoped packages are the one that actually makes a naive diff fail on CI, and they are invisible from a Mac — `pnpm notices` there produces a date-only diff, so the check looks like it would work. If you touch this again, reason from `os`/`cpu`/`libc` in the lockfile, not from what your laptop produces.
2. **`fsevents` is not a per-platform build artifact.** The other three are one-variant-per-host builds of a parent package (lightningcss, turbo, rolldown) and carry their parent's notice. fsevents is an independent project that happens to be darwin-only, with its own copyright holders. Any scheme that treats "platform-scoped" as "same notice as the parent, therefore droppable" is wrong on exactly this package.
3. **Verified the tail cannot leak into the compared prefix.** A platform-scoped package with its own dependencies would drag non-platform packages in and out of the portable set per host, silently breaking the check. Checked the whole lockfile: no `os`/`cpu`/`libc`-constrained entry declares `dependencies`/`optionalDependencies`/`peerDependencies`. Re-verify if that ever changes — it is recorded in the script header for that reason.
4. **The check must fail closed when the marker is missing.** A file predating this change, or a hand-edited one, would otherwise compare an empty prefix to an empty prefix and report "in sync." Covered by verification case 4.
5. **`pnpm run <script>` auto-installs first on pnpm 11** (also noted in the P0-11 handover). The first `pnpm notices` in a fresh worktree syncs `node_modules` before the script executes. Not the generator doing installs.
6. **A count of an excluded set is still part of the included region.** The design carefully kept host-dependent _packages_ out of the compared prefix and then printed a _tally_ of them in the header, four lines from the sentence claiming the prefix is a pure function of the tree. Whenever you exempt a region from a check, audit what the rest of the document derives from it — summaries, totals and cross-references are the leak, not the data.
7. **The rewrite tripped the repo's own 300-line file limit** (344 lines) — decomposed into two library modules rather than trimming the explanation, per the P2-06 / dogfooding precedent. **The split is verified byte-neutral**: `THIRD-PARTY-NOTICES` has SHA `ead639e766…` before and after each of the two splits.

## Verification

`--check` was exercised against the real repo, eight cases, all re-run after the review fixes:

| #   | Scenario                                                                                                              | Expected | Result |
| --- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | Committed file matches the tree                                                                                       | exit 0   | ✅     |
| 2   | One version hand-edited above the boundary (`zod 4.4.3` → `4.4.4`)                                                    | exit 1   | ✅     |
| 3   | **Platform tail rewritten to linux-x64 variants, `fsevents` removed**                                                 | exit 0   | ✅     |
| 4   | Boundary marker removed                                                                                               | exit 1   | ✅     |
| 5   | `THIRD-PARTY-NOTICES` absent                                                                                          | exit 1   | ✅     |
| 6   | `--check` on a clean tree                                                                                             | no write | ✅     |
| 7   | A whole package block deleted (the real drift mode: dep added, notices not regenerated)                               | exit 1   | ✅     |
| 8   | **Full linux tail: 3 variants swapped, `fsevents` dropped, `@rollup/rollup-linux-x64-gnu` added, count line changed** | exit 0   | ✅     |

**Confirmed on a real Linux runner** — PR #42's `license` job, all 11 checks green:

```
$ node scripts/generate-third-party-notices.mjs --check
THIRD-PARTY-NOTICES is in sync with the dependency tree (498 packages, 14 licenses, 4 platform-specific).
Checked 2026-08-01 · pnpm 11.5.3 · linux-x64; the platform-specific tail is not compared.
```

Same 498 packages / 14 licenses as darwin-arm64 from a file generated on a Mac — the portable set really is host-independent, and the design no longer rests on simulation. Linux also reports **4** platform-specific packages, matching the reviewer's lockfile reconstruction (three variants swapped, `fsevents` out, `@rollup/rollup-linux-x64-gnu` in). Note what that means: the header-count HIGH really would have passed its first CI run by coincidence.

Cases 3 and 8 are the ones that matter for CI: they simulate what a Linux runner produces and confirm the check does **not** false-fail. Case 2's report names the line, the committed value and the expected value.

**Case 8 exists because the independent review found the gate's one real hole.** The first implementation printed `plus N platform-specific package(s)` in the header — i.e. a count derived from the host-dependent set, sitting _above_ the boundary, inside the compared region. Every doc in this task asserted "everything above the marker is a pure function of the tree"; that one line made it false, and case 3 could not catch it because it only edited the tail. It would have gone red on a future dependency bump with a diagnostic pointing at line 23 and no visible connection to the cause. The count now lives below the boundary; `header()` carries a comment saying why nothing derived from the platform set may ever go back.

The review also found `readdirSync` output being used unsorted (`copyrightLines`) — Node guarantees no order, and it differs between the maintainer's APFS and CI's ext4. **`@bcoe/v8-coverage` ships both `LICENSE.md` ("Charles Samborski") and `LICENSE.txt` ("Contributors")**, both rendered inside the compared region, so their order was filesystem-determined. Sorted now, along with `pkg.paths`.

## State of the System

- ✅ Tests: **737 passing** (70 files), coverage 97.91% statements / 94.26% branches / 99.77% functions — unchanged, this task adds no product code
- ✅ Lint, typecheck, build, format:check, license-check, boundaries all green at root
- ✅ `pnpm notices:check` green: 498 packages, 14 licenses, 4 platform-specific
- ✅ Self-scan: `argus check .` → **0 violations, 0 failures, 151 files** (first run flagged the 344-line generator and a missing JSDoc on an exported helper; both fixed in-branch, not ignored)
- ⚠️ **Tracker + handover will conflict with `doc-02-showcase-readme`**, which rewrites both. `docs/handovers/p2-06-autofix-engine-handover.md` is archived here byte-identically to DOC-02's copy, so that add/add merges cleanly; `HANDOVER.md` and `IMPLEMENTATION.md` will need a manual resolve on whichever PR merges second.
- ✅ Independent review (Sonnet, cross-family): **REQUEST CHANGES — 1 HIGH + 1 MEDIUM + 2 LOW, all addressed in-branch** (separate fix commit). The HIGH is the header-count hole described under Verification; the reviewer reproduced it against the real `buildNotices()` output.
- ✅ **PR [#42](https://github.com/WeaversMask/argus-oss/pull/42) open — all 11 CI checks green**, including the new `notices:check` step on real linux-x64 (see Verification) and the review gate after the packet comment landed
- ⬜ Awaiting the maintainer's merge decision — agents never merge

## Recommended Next Steps

1. **P2-05 (diff mode)** — still the one remaining numbered P2 task; needs `packages/orchestrator/`, which does not exist yet.
2. The **M1 showcase tail** — DOC-02 is in flight; DOC-03/DOC-04/OPS-05 are open.
3. If the notices gate ever goes red on a Dependabot PR, the fix is `pnpm notices` and commit — the failure output names the differing lines.

## Open Questions for the Next Agent

- Should `scripts/` get a test project? Three CI-relevant scripts now have zero automated coverage. It is a small vitest project plus fixtures, and it would let the drift check's fail-closed paths be regression-tested rather than hand-verified once.
- Should `notices:check` join the pre-push hook? It costs ~3s and would catch drift before CI, at the price of slowing every push.

## Files Touched This Session

`scripts/lib/installed-packages.mjs`, `scripts/lib/third-party-notices.mjs` [created]; `scripts/generate-third-party-notices.mjs`, `package.json`, `.github/workflows/ci.yml`, `THIRD-PARTY-NOTICES` [regenerated], `CONTRIBUTING.md`, `docs/adr/0002-*.md`, `docs/plan/protocols/quality-gates.md`, `docs/IMPLEMENTATION.md`, `docs/HANDOVER.md`, `docs/handovers/p2-06-autofix-engine-handover.md` [archived].

## Sign-off

The gate is real and its limits are written down in the file it checks, in the script that checks it, and in the ADR that requires it. What it cannot verify — the platform tail — is stated rather than implied.

— claude-opus-5
