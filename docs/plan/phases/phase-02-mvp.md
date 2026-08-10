# Phase 2 — MVP: CLI + Basic Rules + JSON Output

> **Self-contained phase doc.** When done, **Milestone M1 — Showcase-Ready is reached** ([roadmap §Milestone M1](../02-roadmap.md#milestone-m1--showcase-ready-end-of-phase-2)). Continuing to Phase 3 is a maintainer decision (continuation track), not a default — record it in `IMPLEMENTATION.md` before loading [`phase-03-layer-enforcement.md`](./phase-03-layer-enforcement.md).
> ⭐ **First demoable milestone.** End of this phase = working tool that runs on real projects **and a repo that stands alone as a showcase**.

**Duration:** ~3 weeks
**Demoable:** ✅ **First demo.** `argus check .` produces real findings.
**Prerequisites:** Phase 1 complete

---

## Goal

A working tool. `argus check ./src` produces real findings against a real project. The platform is dogfoodable from the end of this phase onwards — CI of Argus will run Argus on Argus.

---

## Required Reading Before Starting

- [`../00-principles.md`](../00-principles.md) §3 (Testing Principles) — especially TDD for rules

---

## Tasks

### [P2-01] First 10 built-in rules (quality + style)

- **Deps:** P1 complete
- **Outputs:** `packages/rules-builtin/src/`
  - `quality/cyclomatic-complexity.ts`
  - `quality/max-function-length.ts`
  - `quality/max-file-length.ts`
  - `quality/max-nesting-depth.ts`
  - `quality/no-dead-code.ts`
  - `style/naming-convention.ts`
  - `style/import-order.ts`
  - `style/no-wildcard-imports.ts`
  - `docs/require-jsdoc.ts`
  - `testing/no-empty-test.ts`
- **Acceptance:**
  - Each rule has at least 5 valid fixtures and 5 invalid fixtures in `tests/fixtures/`
  - Each rule has TSDoc documentation generated into the rule reference
  - All rules pass property-based tests where applicable
- **Effort:** XL

### [P2-02] CLI scaffolding with commander

- **Deps:** P1 complete
- **Outputs:** `apps/cli/`
  - `argus check [path]` command
  - `argus init` command (basic config generation)
  - `argus explain <rule-id>` command
  - `argus --version`, `--help`
- **Acceptance:**
  - All commands work with `--help`
  - Exit codes follow convention: 0 = success, 1 = violations found, 2 = error
- **Effort:** M

### [P2-03] Console output formatter

- **Deps:** P2-02
- **Outputs:** `apps/cli/src/formatters/console.ts`
  - Colour-coded severity, file path with `line:col`, rule ID, message
  - Summary footer with counts per severity
- **Acceptance:**
  - Output readable in standard terminals (light and dark)
  - Respects `NO_COLOR` env var
- **Effort:** S

### [P2-04] JSON output formatter

- **Deps:** P2-02
- **Outputs:** `apps/cli/src/formatters/json.ts`
- **Acceptance:**
  - Output validates against a Zod schema exported from `@argus/api-contracts`
  - Suitable for piping to `jq` and downstream tooling
- **Effort:** S

### [P2-05] Diff-only scan mode

- **Deps:** P2-02
- **Outputs:** `packages/orchestrator/src/diff-extractor.ts` + `--diff` CLI flag
- **Acceptance:**
  - `--diff main` analyses only files changed since `main`
  - Line-level filtering — violations outside changed line ranges are suppressed
- **Effort:** M
- **Rulings taken while implementing (2026-08-02):**
  - **"Since `main`" means since the merge base, against the working tree.** A two-dot `git diff main` reports post-branch-point work on `main` as reversals, attributing a colleague's changes to the caller; comparing against `HEAD` instead of the working tree puts the line numbers out of step with the bytes the scanner reads
  - **Untracked files count, in full.** Git diffs only what it tracks, so a brand-new file has no diff — skipping it reports zero violations for the newest code in the change
  - **Every git failure is fatal (exit `2`), never a fall back to a full scan.** Silently scanning everything reads as a regression; silently scanning nothing reads as a pass
  - **Git is injected, not a core port** — the domain has no VCS concept, so `GitRunner` is declared in the orchestrator ([ADR-0008](../../adr/0008-scan-scope-orchestration.md)). Revisit if a second consumer appears
  - `--diff` is `check`-only; `fix` still works on the whole path

### [P2-06] Auto-fix engine (formatting only)

- **Deps:** P2-01
- **Outputs:** `argus fix` command, magic-string-based edits delegated to Prettier for formatting rules
- **Acceptance:**
  - `--dry-run` shows diffs without applying
  - Fix never destroys comments or significant whitespace
  - Round-trip safe: `fix` then re-run shows no violations
- **Effort:** L

---

## Milestone M1 tasks (showcase tail — maintainer directive 2026-07-18)

> These make the repo deliver its career value at the Phase 2 boundary: a 30-second recruiter surface, a plain-language workflow story, a guided developer path, a documentation cadence that holds if work continues, and go-public readiness. Full criteria: [roadmap §Milestone M1](../02-roadmap.md#milestone-m1--showcase-ready-end-of-phase-2). Two audiences, two depths — and the complexity bar for both is _"ah, I get it"_, with links carrying the depth.

### [DOC-02] Showcase README — the 30-second recruiter surface

- **Deps:** P2-01–P2-04 (a real scanner must exist to demo)
- **Outputs:** rewritten top of root `README.md`; committed terminal-demo recording of `argus check` running **on Argus itself** (asciinema/vhs-style SVG or GIF — vet the recording tool per ADR-0003 if it becomes a dependency; a checked-in artifact needs none)
- **Acceptance:**
  - Top of README, in this order: one-sentence what-it-is · three bullets on why it's interesting (deterministic scanning, mechanically-enforced architecture, built by agents under mechanical gates) · the self-scan demo · a **quality-receipts table** — each row is one guardrail: plain-language claim → link to the mechanism (config/workflow file) → link to one real receipt (a PR or CI run where it demonstrably worked) · quickstart in ≤3 commands · honest status line + link to the continuation-track roadmap
  - Comprehension bar: a technical reader who reads only the README top can say what Argus is, how it works, and how its quality was enforced — without opening a second file
  - Every impressive claim is verifiable via its link; nothing aspirational presented as done
  - The continuation-track roadmap is framed as "what's next" — deliberate future work, never unfinished debt (M1 criterion 6)
  - Existing posture/licensing/dev-setup sections stay, below the fold
- **Effort:** M

### [DOC-03] Workflow showcase — how guardrails produced production-grade code

- **Deps:** none hard (receipts already exist; polish after DOC-02 framing settles)
- **Outputs:** `docs/workflow.md`, linked prominently from the README and `docs/dev/README.md`
- **Acceptance:**
  - One diagram of the loop: pick task → branch → build under gates → independent review (tiered, cross-model) → human-only merge → tracker/handover rotation
  - Each guardrail gets ≤1 short plain-language paragraph linking its mechanism **and one real receipt** — e.g. the workspace-cycle CI catch (P1-02/#13), an independent review packet (#22), the gitleaks negative tests, the license gate, the mutation baseline
  - Readable by someone who has never seen an agentic workflow: no protocol jargon without a one-line gloss; the reader should finish thinking _"I see why this code can be trusted"_
- **Effort:** M

### [DOC-04] Developer tour — 15 minutes to a working mental model

- **Deps:** P2-01 (the tour follows one real rule end-to-end)
- **Outputs:** `docs/dev/tour.md`, linked from `docs/dev/README.md` and `docs/architecture.md`
- **Acceptance:**
  - An ordered reading path with a "what to notice here" line per stop: `architecture.md` → core (domain + one port) → `@argus/ast` (the adapter pattern) → one built-in rule end-to-end (fixture → rule → finding → violation) → how CI enforces the boundaries
  - A newcomer who follows it can then complete the `adding-a-rule` recipe unaided
  - ≤1 page of prose; links carry the depth — the tour orients, it does not duplicate
- **Effort:** S

### [DOC-05] Documentation cadence — per-task increments, per-phase consolidation

> **Why this exists.** Everything above makes the repo legible **at the M1 boundary**. This keeps it legible **if work continues**: the continuation track only pays off if a phase picked up months later ships documentation at the same rate the code lands, instead of accruing a docs debt someone must excavate later. Two gaps make that unlikely today. First, the per-task obligation in [`../03-documentation.md`](../03-documentation.md) is **prose with no mechanism** — precisely the class of gap OPS-06 closed for `THIRD-PARTY-NOTICES`, where six tracker rows asserted a freshness claim that nothing checked. Second, there is **no third-party-legible progress surface at all**: `IMPLEMENTATION.md`'s Recently Completed rows are agent-facing forensics (several run past a thousand words) — the right depth for the next picker, and unusable for anyone asking "what has this project actually delivered, and when?"

- **Deps:** DOC-03 + DOC-04 (both create surfaces the first consolidation pass must audit — running it earlier audits a knowingly incomplete tree). Runs **before** OPS-05, which stays the phase's final task.
- **Outputs:**
  - `docs/progress.md` — the third-party tier: one entry per merged task, dated, PR-linked, ≤5 lines of plain language ("what can be done now that could not before"). **Seeded retroactively across Phases 0–2** so the log starts complete rather than from the day it was created.

    > **Maintainer ruling, 2026-08-02 — `progress.md`, not a `CHANGELOG.md`.** The open question from DOC-05's filing is closed; build the progress log and do not add a hand-written changelog. Four reasons, recorded so this is not re-litigated mid-task. (1) **There are no versions to change between** — every package is `private: true` at `0.0.0` and nothing is published, so a changelog whose every entry sits under `## [Unreleased]` is one in name only; semver is that format's spine. (2) **Changesets already owns that filename**: [`.changeset/config.json`](../../../.changeset/config.json) sets `"changelog": "@changesets/cli/changelog"` with `access: "public"`, so `changeset version` will **generate** a per-package `CHANGELOG.md` from changeset files. **That is closer than it looks, and `private: true` does not hold it back:** with `privatePackages` unset the resolved default is `{ version: true, tag: false }` (verified in `@changesets/config@3.1.4`), so private packages are versioned and changelogged normally — `private` blocks only `changeset publish`. And [`release.yml`](../../../.github/workflows/release.yml) already runs `changesets/action` on **every push to `main`**, so generation begins the moment any changeset file lands, not when packaging is resolved (D-8). A hand-written changelog would collide with that on the very next release-worthy PR. (3) **The audiences are different.** A changelog serves someone upgrading a dependency; nobody upgrades Argus. `progress.md`'s reader is someone asking what the project has delivered and when — they want "the CLI became runnable", not `fix: anchor scan paths to the project root`. (4) **Retroactive seeding is cheaper and more honest**: one plain paragraph per merged task, read off the tracker rows, versus inventing version numbers for the thirty-odd merged tasks (52 PR merge commits) of Phases 0–2, none of which were ever released.

  - A `docs-delta` job in `.github/workflows/ci.yml`, modelled on the existing `review-gate` job (which fails a non-draft PR carrying no review evidence): a non-draft PR touching `packages/*/src/**`, `apps/*/src/**` or `scripts/**` while touching **no** documentation surface fails, unless its body carries an explicit `no docs delta — <reason>` line. Shell + `gh`, no new dependency.
    **"Documentation surface" must be defined by the implementer and cannot be a pure path match.** Five of the six capture streams in [`../03-documentation.md`](../03-documentation.md) live outside source (`docs/**`, any `README.md`, `docs/adr/**`) — but the sixth, **TSDoc on public exports, lives _inside_ `packages/*/src/**`**, the very paths the gate treats as source. A path-only gate therefore cannot tell a TSDoc-only PR from one with no delta at all, and would force a false `no docs delta` line onto a change that plainly has one. Resolve it explicitly, either way, and record which: inspect the diff **content** for changed doc-comment lines, or declare content inspection too fragile and document the justification line as the intended escape hatch for TSDoc-only changes. What is not acceptable is leaving it implicit for the gate's first false positive to discover.

    > **Implementation note, DOC-05 (2026-08-02) — this bullet's own glob is wrong, and the shipped gate deliberately differs.** `packages/*/src/**` matches one path segment before `src/`, which silently exempts **`packages/adapters/prettier/src/**`** — the repo's only adapter package, and the seed of the family Phase 4 grows. The gate as built uses `^(packages|apps)/.+/src/` instead, so nesting depth does not matter. Recorded here rather than edited in place: the spec is what the work was measured against, and quietly rewriting it after the fact is how a checklist stops meaning anything (the DOC-04 precedent). Copy the shipped pattern, not this bullet's.
    >
    > Also inherited from DOC-04 and still uncorrected above: [DOC-04]'s acceptance path reads "fixture → rule → **finding** → violation". `Finding` is the `ToolAdapterPort` type and appears nowhere in the rule path — the real path is `fixture → rule → context.report → Violation`. Two specs in a row with a wrong parenthetical: **treat the arrow diagrams in phase files as intent, not as API.**

  - [`../templates/PHASE-DOC-AUDIT.template.md`](../templates/) — the per-phase consolidation checklist, so the pass is repeatable and its reports are comparable across phases.
  - The cadence written **once** into [`../03-documentation.md`](../03-documentation.md); [`../protocols/agentic-execution.md`](../protocols/agentic-execution.md) §Task Completion Checklist and §Phase Transitions link it rather than restating it.
  - The consolidation pass added as an **exit criterion in every remaining phase file (3–11)**, so the gate travels with the phase and not only with the protocol.
  - One executed Phase 2 audit report, committed under `docs/audits/`.
- **Acceptance:**
  - **The per-task tier is mechanical, not prose:** `docs-delta` is negative-tested **in both directions** — a source-only PR with no doc surface and no justification line fails, and the same PR passes once either is present — with the evidence recorded in the PR, the standard every dependency-cruiser rule and the gitleaks gate are already held to. It fails closed, and applies from its merge forward; it never retro-judges already-merged work.
  - **The per-phase tier is a checklist with an oracle, not a vibe:** `architecture.md` verified against the real package graph (dependency-cruiser's module/dependency counts are the oracle, so drift is _measured_, not eyeballed) · every package/app `README.md` matches its actual public surface · every user-facing capability the phase shipped has a [`../../guide/`](../../guide/) line · every first-of-a-pattern has a [`../../dev/`](../../dev/) recipe · every decision has an ADR · `docs/README.md`'s document map matches the real tree · the phase's section of `docs/progress.md` reads as a coherent story to someone who has never seen the repo.
  - **The pass is executed once against Phase 2 itself before this task is called done** — the cadence proves itself on the phase that installs it rather than shipping as an untested checklist. Whatever it finds is fixed in the same PR or filed as its own task: a "known stale" line left standing in a report is a failed audit, and a first report that finds _nothing_ is evidence the pass was not really run.
  - **A reader who has never seen the repo can follow `docs/progress.md` alone** and say what shipped, when, and in what order. The file states its division of labour in one line, and that line is **three-way**, so no future task re-opens the changelog question: `IMPLEMENTATION.md` is for the next agent · `progress.md` is for a human visitor · per-package `CHANGELOG.md`s are generated by changesets, never hand-written.
- **Effort:** M

### [OPS-05] Go-public readiness sweep

- **Deps:** none (re-verify as the phase's final task — after DOC-05, so the sweep sees the cadence in place)
- **Outputs:** all agent-preparable items of the [go-public runbook](../../go-public-runbook.md) executed/verified; a readiness report (checked list) in the PR and tracker
- **Acceptance:**
  - Paranoia check re-run and recorded (0 personal-email hits on `origin/main`); docs tree passes the SECURITY-NOTES personal-data rules (no private paths/identifiers)
  - Badges prepared for README (CI, coverage, mutation score, license gate) — wired or staged where a public repo is required
  - The remaining list is exactly the maintainer's ~10-minute flip list (LICENSE placeholder, visibility, private-vuln-reporting, CodeQL/Scorecard) — restated as **maintainer-only; agents never change repo visibility** (M1 readiness ≠ scheduling)
- **Effort:** S

---

## Follow-up tasks (filed by the Phase 2 documentation audit)

Not part of the M1 showcase tail — maintenance the [audit](../../audits/phase-02-doc-audit.md) found and filed rather than fixed in DOC-05's own PR.

### [DOC-06] Close the audit's three filed findings

- **Deps:** DOC-05 (the audit that filed them)
- **Outputs:** `scripts/rotate-handover.mjs` + `pnpm handover:rotate|check`; the archive's links repaired; [`../../dev/adding-an-adapter.md`](../../dev/adding-an-adapter.md); [`../../adr/0007-api-contracts-boundary.md`](../../adr/0007-api-contracts-boundary.md)
- **Acceptance:**
  - Findings 2, 3 and 5 closed; the repo-wide link oracle reports zero broken relative links
  - **The rotation fix is mechanical, not procedural** — a protocol step telling the next agent to re-resolve links by hand is the same good intention that produced the rot. The script re-resolves as it copies and fails closed
  - The adapter recipe covers the `packages/adapters/*` shape that actually shipped (`FormatterPort`, in-process, MIT). `ToolAdapterPort`'s specifics — `_shared/`, subprocess handling, copyleft isolation — stay unwritten until P4-01 builds them, and get their own page
- **Effort:** S

---

## Phase 2 Exit Criteria

- [ ] **MVP demo recorded:** `pnpm install -g @argus/cli && argus check .` produces findings on a real-world TS project — **half done, deliberately unticked (DOC-07).** The second clause is settled with evidence: three SHA-pinned third-party repos scanned, 464 files, 0 parse failures, findings on all three ([`field-results.json`](../../field-results.json), README §Field results). The first clause is unreachable until packaging lands — nothing is published to npm, so `install -g` cannot be demonstrated at all
- [ ] 10 rules in production with full fixture coverage
- [x] CI of Argus itself runs Argus on Argus — dogfooding starts here
- [ ] **Milestone M1 — Showcase-Ready reached:** DOC-02/DOC-03/DOC-04/DOC-05/OPS-05 shipped and the [roadmap §Milestone M1](../02-roadmap.md#milestone-m1--showcase-ready-end-of-phase-2) criteria all hold
- [x] **Documentation consolidation pass executed and its report committed** under [`../../audits/`](../../audits/) — the per-phase tier of the [documentation cadence](../03-documentation.md), worked against [`../templates/PHASE-DOC-AUDIT.template.md`](../templates/PHASE-DOC-AUDIT.template.md). **This phase cannot be marked ✅ Complete until that report reads ✅ pass** and every finding is fixed or filed. Applied to this phase first, under DOC-05 — this criterion is what every later phase inherits ([`phase-02-doc-audit.md`](../../audits/phase-02-doc-audit.md))
- [ ] Phase handover written with rule authoring tutorial and performance benchmarks against typical codebases — **plus the maintainer's continuation decision recorded** (pause at M1 or proceed to Phase 3)

---

## Phase-Specific Notes

- **Rule authoring is now an established pattern.** Document it well in the handover — future agents will write many rules, and a clear tutorial saves hours per rule.
- **Performance budget for `check`:** <30 seconds for a 50k-line project (per the spec doc). Benchmark on every PR; fail CI if exceeded.
- **The auto-fix engine is the riskiest part of this phase.** Round-trip safety is non-negotiable — losing a comment or breaking semantic whitespace is a P0 bug. Test obsessively.
- **Dogfooding starts here.** Once Argus can scan itself, every PR must produce zero new violations. This is the strictest possible test of the tool's own quality.

---

## Definition of Done for Phase 2

The next agent can:

1. Run `argus check` on a real project and get useful findings
2. Add a new rule by following the documented pattern (no engine changes needed)
3. See `argus` running in CI against its own codebase
4. Start Phase 3 confident the engine is solid
