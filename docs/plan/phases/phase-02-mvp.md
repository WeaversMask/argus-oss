# Phase 2 — MVP: CLI + Basic Rules + JSON Output

> **Self-contained phase doc.** When done, set Current Phase to P3 and load [`phase-03-layer-enforcement.md`](./phase-03-layer-enforcement.md).
> ⭐ **First demoable milestone.** End of this phase = working tool that runs on real projects.

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

## Phase 2 Exit Criteria

- [ ] **MVP demo recorded:** `pnpm install -g @argus/cli && argus check .` produces findings on a real-world TS project
- [ ] 10 rules in production with full fixture coverage
- [ ] CI of Argus itself runs Argus on Argus — dogfooding starts here
- [ ] Phase handover written with rule authoring tutorial and performance benchmarks against typical codebases

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
