# Phase 11 — Hardening, Documentation & GA

> **Self-contained phase doc.** Final phase. End state: v1.0 launched.

**Duration:** ~3 weeks
**Demoable:** ✅ **Launch.**
**Prerequisites:** Phase 10 complete

---

## Goal

Production-ready 1.0. Performance verified, security audited, documentation complete, beta partners promoted to GA customers.

---

## Required Reading Before Starting

- [`../protocols/quality-gates.md`](../protocols/quality-gates.md) — pre-release gates apply throughout this phase
- [`../../risks.md`](../../risks.md) — close out as many open risks as possible

---

## Tasks

### [P11-01] Performance profiling and optimisation

- **Deps:** P10 complete
- **Outputs:** Flame graphs for hot paths, caching layer for AST parsing, benchmark suite
- **Acceptance:** All performance targets from the spec doc §4.6 met:
  - Small (<10k lines): <5s full scan
  - Medium (50k lines): 15-30s
  - Large (200k lines): 1-2 min
  - Monorepo (1M+ lines): 5-10 min
- **Effort:** L

### [P11-02] Security audit

- **Deps:** P11-01
- **Outputs:** External pen test report, dependency audit, threat model document
- **Acceptance:** No high/critical findings open; all medium findings have documented mitigations
- **Effort:** L
- **Note — P0-07 stopgap exists:** Phase 0 added a lightweight `pnpm audit --audit-level=high` CI job (see [`P0-07`](./phase-00-foundation.md)) as a temporary measure during the 2026 npm supply-chain wave. That job covers **only** the public-advisory subset and does **not** discharge this task's dependency-audit obligation (typosquat detection, behavioural / install-script analysis, license review, threat-model alignment). When this task lands, the more comprehensive tooling chosen here should replace or supersede the P0-07 job — do not assume P0-07 already covers it.

### [P11-03] Full documentation site

- **Deps:** P10 complete
- **Outputs:** Docusaurus (or Mintlify) site — **assembled and polished from the material captured progressively per [`../03-documentation.md`](../03-documentation.md)**, not written from scratch:
  - User guide (edit/expand `docs/guide/`)
  - Rule reference (auto-generated from rule TSDoc)
  - Layer manifest guide
  - API docs (auto-generated from tRPC routers)
  - Architecture section (from `docs/architecture.md` + package READMEs)
  - Contributor guide + recipes (from `docs/dev/`)
  - ADR index
  - Tutorials and recipes
- **Effort:** XL (largely assembly if the capture streams have been fed along the way)

### [P11-04] Migration guides

- **Deps:** P11-03
- **Outputs:** Guides for users coming from:
  - SonarQube
  - ESLint-only setups
  - ArchUnit (Java users adapting concepts)
- **Effort:** M

### [P11-05] Beta program exit

- **Deps:** All previous tasks
- **Outputs:** 10 design partners onboarded, feedback incorporated, case studies drafted
- **Effort:** L

### [P11-06] 1.0 launch

- **Deps:** P11-01 through P11-05
- **Outputs:** Marketing site, launch blog post, Hacker News / Product Hunt launch
- **Effort:** M

---

## Phase 11 Exit Criteria

- [ ] v1.0 published to npm, Docker Hub, GHCR (`TODO(licensing:)` — prebuilt images that bake in the copyleft engines need the ADR-0002 §D redistribution review first), VS Code Marketplace, GitHub Marketplace, GitLab
- [ ] Documentation site live
- [ ] Beta partners promoted to GA customers
- [ ] Marketing site live
- [ ] Launch announcements published

---

## Phase-Specific Notes

- **Performance work is iterative and never finished.** Set explicit budgets; declare done when budgets are met. Don't optimise speculatively.
- **External pen test takes 2-4 weeks** with a reputable firm. Start scheduling at the beginning of this phase.
- **Documentation auto-generation** from TSDoc and tRPC schemas saves enormous maintenance burden. Invest in the tooling rather than hand-writing rule reference pages.
- **Beta partners are gold.** Their feedback shapes 1.0. Onboard them aggressively during Phase 7-8 if possible; don't wait until Phase 11.
- **Launch is a marathon, not a sprint.** Plan for sustained marketing through 1.x rather than one big bang.

---

## Definition of Done for Phase 11

The product is in production:

1. Anyone can install and use it
2. Documentation answers common questions
3. Beta partners have signed off
4. The team can rest, briefly, before 1.1
