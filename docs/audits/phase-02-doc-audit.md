# Phase 2 — Documentation Consolidation Audit

**Phase:** 2 — MVP (CLI + basic rules + JSON output) → Milestone M1 Showcase-Ready
**Auditor:** claude-opus-5
**Date:** 2026-08-02
**Commit audited:** `0d5f8b0` on `main` (plus the fixes listed under Findings, which land in DOC-05's own PR)
**Verdict:** ✅ pass — with 6 findings, all fixed here or filed

> The first execution of the per-phase tier of the [documentation cadence](../plan/03-documentation.md), run against the phase that installs it. Template: [`PHASE-DOC-AUDIT.template.md`](../plan/templates/PHASE-DOC-AUDIT.template.md).
>
> Phase 2 is **not complete** — P2-05 and OPS-05 remain open. This pass audits the tree as it stands so the cadence is proven rather than shipped untested; it must be **re-run at the phase boundary**, when those two tasks have landed and the exit criterion is actually being claimed.

---

## Scope

Tasks merged in Phase 2 to date, from [`../IMPLEMENTATION.md`](../IMPLEMENTATION.md) and [`../progress.md`](../progress.md):

| Task ID | Title                                          | PR                                                      |
| ------- | ---------------------------------------------- | ------------------------------------------------------- |
| P2-01   | First 10 built-in rules                        | [#29](https://github.com/WeaversMask/argus-oss/pull/29) |
| P2-02   | CLI scaffolding (`check`/`init`/`explain`)     | [#31](https://github.com/WeaversMask/argus-oss/pull/31) |
| P2-03   | Console output formatter                       | [#35](https://github.com/WeaversMask/argus-oss/pull/35) |
| P2-04   | JSON output formatter + `@argus/api-contracts` | [#37](https://github.com/WeaversMask/argus-oss/pull/37) |
| P2-06   | Auto-fix engine                                | [#39](https://github.com/WeaversMask/argus-oss/pull/39) |
| DOGFOOD | CI runs Argus on Argus                         | [#38](https://github.com/WeaversMask/argus-oss/pull/38) |
| OPS-06  | THIRD-PARTY-NOTICES drift gate                 | [#42](https://github.com/WeaversMask/argus-oss/pull/42) |
| DOC-02  | Showcase README                                | [#41](https://github.com/WeaversMask/argus-oss/pull/41) |
| DOC-03  | Workflow showcase                              | [#44](https://github.com/WeaversMask/argus-oss/pull/44) |
| DOC-04  | Developer tour                                 | [#45](https://github.com/WeaversMask/argus-oss/pull/45) |
| DOC-05  | Documentation cadence                          | this PR                                                 |

Plus the maintenance PRs recorded in `progress.md` (#30, #32, #33, #34, #36, #40, #43, #46).

**Open, therefore out of scope:** P2-05 (diff mode), OPS-05 (go-public sweep).

---

## 1. Architecture map vs. the real package graph

**Measured:** modules `248` · dependencies `847` · packages `9` (8 packages + 1 app) · ports `11` · fakes `10` · built-in rules `10` · dependency-cruiser rules `17`

- [x] Every workspace package appears in [`../architecture.md`](../architecture.md)'s table, and vice versa — 9 for 9, exact match against the `exports` listing
- [x] The dependency directions the map asserts match the cruiser's actual rules. Every rule the map names by ID exists: `core-only-neverthrow`, `core-no-node-builtins`, `packages-never-import-apps`, `rule-engine-never-imports-adapters`, `testing-src-core-type-only`, and one `*-public-entry-only` per package — **8 of them for 9 packages**, which matches the map's own explanation that `apps/cli` needs none because nothing imports it
- [x] **Every countable claim counted.** Ports: `packages/core/src/ports/index.ts` exports 11. Fakes: `packages/testing/src/mocks/index.ts` exports 10; `FormatterPort` has none. The map's "ten of the eleven" wording is **accurate** — it was corrected under DOC-04 after its review caught the older "every port has a fake" claim. Built-in rules: 10 rule modules, matching `guide/rules.md`'s catalogue of 10

**Result:** ✅ pass. The one countable claim that had gone stale was already caught and fixed one task earlier; re-counting confirmed the correction rather than finding a new drift.

## 2. Package and app READMEs vs. their actual public surface

- [x] All 9 packages/apps have a `README.md`
- [x] Surfaces match `exports`. The only package with a non-trivial map is `@argus/testing` (`.`, `./config`, `./setup`) and its README documents all three in a table, keyed to `package.json`. The other eight expose a single `.` entry point
- [x] Stated roles still match behaviour after P2-06 added `@argus/adapters-prettier`

**Result:** ✅ pass.

## 3. User-facing capabilities vs. `guide/`

Walked the phase's task list, not the guide's contents.

- [x] `argus check` · `--format json` · `argus fix` · `--dry-run` · `argus init` · `argus explain` · exit codes 0/1/2 · global flags — all have sections in [`../guide/cli.md`](../guide/cli.md)
- [x] `argus.yaml` schema, severities and `extends:` — [`../guide/configuration.md`](../guide/configuration.md)
- [x] All 10 rules catalogued with fixability marked per rule, and the per-violation caveat stated — [`../guide/rules.md`](../guide/rules.md)
- [x] `explain`'s documented output does **not** claim to report fixability, which matches what it actually prints. The known gap (explain is silent about fixability) is a code gap, honestly reflected in the docs

**Finding 1 — MAJOR, fixed here.** `guide/rules.md`'s opening paragraph read: _"Each is off until a config activates it (rule-config wiring lands with the CLI); until then this page is the catalogue and the reference."_ **Rules are on by default.** Verified by running `argus check` against a deliberately-violating file outside the repository, so no `argus.yaml` was discoverable: 3 rules fired (`docs/require-jsdoc`, `quality/max-nesting-depth`, `style/no-wildcard-imports`) with no configuration present. The repo's own `argus.yaml` says the same thing in a comment — "No `rules:` section — every built-in rule stays on at its default severity". The sentence was true when written at P2-01, before the CLI existed; P2-02 shipped it and nobody revisited the page. It is the **first sentence a user reads** on the rules page and told them the opposite of what the tool does.

**Result:** ✅ pass after the fix.

## 4. First-of-a-pattern vs. `dev/` recipes

- [x] Built-in rules (P2-01) → [`adding-a-rule.md`](../dev/adding-a-rule.md), including the package layout and fixture conventions
- [x] Report formatters (P2-04) → [`adding-a-report-formatter.md`](../dev/adding-a-report-formatter.md)
- [x] Offering a fix (P2-06) → `adding-a-rule.md` §"Offering a fix", which covers the safety rule, the four decline conditions, and the comment trap
- [x] Existing recipes still describe the current shape of what they teach

**Finding 2 — MINOR, filed.** `@argus/adapters-prettier` (P2-06) is described in `architecture.md` as "the first of the planned `packages/adapters/*` family", and **there is no `dev/` recipe for adding one**. Under the standard the recipe was due when that first instance was built. Phase 4 is an entire phase of adapters, so the debt comes due there with the rationale a phase colder.

**Result:** ✅ pass with Finding 2 filed.

## 5. Decisions vs. ADRs

- [x] ADR-0006 records the auto-fix representation and safety decisions (P2-06), including the two the reviews forced
- [x] D-8 (CLI packaging) is correctly an **open decision**, not an ADR — it is deferred, not decided
- [x] The dogfooding ignore-scope ruling (maintainer, 2026-07-25) is recorded in the phase file and in `argus.yaml`'s comments
- [x] No ADR is contradicted by what shipped

**Finding 3 — MINOR, filed.** `@argus/api-contracts` depends on **zod alone and deliberately not on core**, so a consumer can adopt the wire format without adopting the domain model. That decision has **no ADR**. It is recorded only in `architecture.md`'s table and the package README — yet it is load-bearing for Phases 6, 7 and 8, and it is important enough that it has its own dependency-cruiser rule (`api-contracts-only-zod`) enforcing it. A decision with a mechanical guard and no recorded rationale is exactly the shape an ADR exists for.

**Result:** ✅ pass with Finding 3 filed.

## 6. `docs/README.md`'s document map vs. the real tree

**Finding 4 — MINOR, fixed here.** The map's ASCII tree was **structurally broken**: indentation collapsed partway through, rendering `plan/`, `adr/` and `handovers/` as siblings of `docs/` rather than children. `go-public-runbook.md` was missing from it entirely. Both corrected, along with the entries this task adds (`progress.md`, `audits/`, `PHASE-DOC-AUDIT.template.md`).

**Finding 5 — MAJOR, one fixed here, the rest filed.** Link integrity, run over every tracked markdown file: **101 broken relative links**.

- **1 live:** `plan/phases/phase-00-foundation.md` linked `../adr/0002-…`, copying the path from `plan/00-principles.md` one directory deeper. **Fixed here.**
- **100 in `docs/handovers/`:** systematic rot with a single cause. `HANDOVER.md` lives at `docs/` and its links are written relative to `docs/`; the rotation protocol copies it one level deeper into `docs/handovers/` without re-resolving them, so every `./plan/…`, `./adr/…` and `../.github/…` breaks on arrival. **Filed** — it needs both a bulk rewrite and a fix to §Handover Rotation itself, which is more than this PR should carry.

**Result:** ✅ pass after the live fix, with the archive backlog filed.

## 7. `docs/progress.md` reads as a story

Read as someone who has never seen the repo, Phase 2 section only.

- [x] Every merged task in scope has an entry, dated and PR-linked
- [x] Entries say what a reader can now do — "Argus is runnable from here", "the first version of Argus that finds anything" — rather than which files moved
- [x] The section reads as a progression: rules exist → a CLI can run them → output becomes readable → output becomes machine-readable → the tool is turned on itself → it starts repairing what it finds → it explains itself

**Finding 6 — MINOR, accepted and recorded.** This section was written in the same task that is being audited, by its author. That is unavoidable for the first pass (the file did not exist before) but it is the weakest check in this report, and the independent review of this PR is the only outside read it gets. From Phase 3 the auditor should be reading a file written incrementally by other tasks.

**Result:** ✅ pass, with the self-audit caveat recorded.

---

## Findings

| #   | Severity | Check | Finding                                                                                     | Disposition                                                         |
| --- | -------- | ----- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | major    | §3    | `guide/rules.md` said built-in rules are off until configured; they are on by default       | **Fixed in this PR** (verified by running the CLI with no config)   |
| 2   | minor    | §4    | No `dev/` recipe for adding a `packages/adapters/*` member; first instance shipped at P2-06 | Filed — tracker backlog, due before Phase 4                         |
| 3   | minor    | §5    | `@argus/api-contracts`' zod-only / not-core boundary has a cruiser rule but no ADR          | Filed — tracker backlog (write ADR-0007)                            |
| 4   | minor    | §6    | `docs/README.md` document map: broken tree indentation, `go-public-runbook.md` absent       | **Fixed in this PR**                                                |
| 5   | major    | §6    | 101 broken relative links — 1 live, 100 systematic rot in `docs/handovers/`                 | Live one **fixed in this PR**; archive + protocol cause filed       |
| 6   | minor    | §7    | The `progress.md` section audited here was written by this same task                        | Accepted for the first pass; recorded so Phase 3 does not repeat it |

## What this pass did not cover

The next auditor inherits these.

- **TSDoc completeness on public exports was not audited.** The sixth capture stream is the one the new `docs-delta` gate watches per-task, but no oracle here checks that every public export actually carries TSDoc. A count of exported symbols against exported symbols with a preceding doc comment would make this mechanical; it is not written yet.
- **`FormatterPort` still has no in-memory fake.** The documentation is now accurate about this (§1), so it is a code gap rather than a doc finding — but it is the reason a countable claim in `architecture.md` went stale, and it remains open.
- **Prose accuracy in `workflow.md` and the README was spot-checked, not re-verified end to end.** DOC-03 verified every receipt in it against the repo at the time; this pass re-checked only the claims that overlap §1's counts.
- **The archived handovers were audited for links only**, not for content that has since become false. They are snapshots and are expected to age, but nothing says so on the files themselves.
- **This pass ran mid-phase.** P2-05 and OPS-05 will add surface that has not been audited at all.

## Sign-off

The tree's documentation is in good shape and the two things that were actually wrong were wrong in the same way: a claim that was **true when written and quietly stopped being true** when a later task changed the world underneath it. `guide/rules.md` said rules are off by default because at P2-01 they effectively were; `architecture.md` said every port has a fake because at P1-02 every port did. Neither author was careless — the failure mode is structural, and it is the specific thing the per-phase pass exists to catch. It is also why §1 now insists that a countable claim gets counted rather than read.

The single highest-value thing the Phase 3 auditor can do first: **re-run §6's link check and §1's counts before reading anything**. Both are cheap, both are mechanical, and between them they caught two of this report's three most significant findings.

— claude-opus-5
