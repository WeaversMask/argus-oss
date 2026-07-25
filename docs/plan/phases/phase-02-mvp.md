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

> These make the repo deliver its career value at the Phase 2 boundary: a 30-second recruiter surface, a plain-language workflow story, a guided developer path, and go-public readiness. Full criteria: [roadmap §Milestone M1](../02-roadmap.md#milestone-m1--showcase-ready-end-of-phase-2). Two audiences, two depths — and the complexity bar for both is _"ah, I get it"_, with links carrying the depth.

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

### [OPS-05] Go-public readiness sweep

- **Deps:** none (re-verify as the phase's final task)
- **Outputs:** all agent-preparable items of the [go-public runbook](../../go-public-runbook.md) executed/verified; a readiness report (checked list) in the PR and tracker
- **Acceptance:**
  - Paranoia check re-run and recorded (0 personal-email hits on `origin/main`); docs tree passes the SECURITY-NOTES personal-data rules (no private paths/identifiers)
  - Badges prepared for README (CI, coverage, mutation score, license gate) — wired or staged where a public repo is required
  - The remaining list is exactly the maintainer's ~10-minute flip list (LICENSE placeholder, visibility, private-vuln-reporting, CodeQL/Scorecard) — restated as **maintainer-only; agents never change repo visibility** (M1 readiness ≠ scheduling)
- **Effort:** S

---

## Phase 2 Exit Criteria

- [ ] **MVP demo recorded:** `pnpm install -g @argus/cli && argus check .` produces findings on a real-world TS project
- [ ] 10 rules in production with full fixture coverage
- [x] CI of Argus itself runs Argus on Argus — dogfooding starts here
- [ ] **Milestone M1 — Showcase-Ready reached:** DOC-02/DOC-03/DOC-04/OPS-05 shipped and the [roadmap §Milestone M1](../02-roadmap.md#milestone-m1--showcase-ready-end-of-phase-2) criteria all hold
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
