# Roadmap Overview

> **Load on demand** when planning cross-phase work or assessing overall progress.
> For the active phase, load only its phase file from [`phases/`](./phases/).

## Phases at a Glance

| #                                           | Phase                        | Duration | Delivers                                         | Demoable?            |
| ------------------------------------------- | ---------------------------- | -------- | ------------------------------------------------ | -------------------- |
| [0](./phases/phase-00-foundation.md)        | Foundation & Tooling         | 2 weeks  | Monorepo, CI, conventions, docker                | No                   |
| [1](./phases/phase-01-domain-core.md)       | Domain Core & Rule Engine    | 3 weeks  | Pure domain model + dispatch engine              | Unit tests only      |
| [2](./phases/phase-02-mvp.md)               | **MVP** — CLI + Basic Rules  | 3 weeks  | `argus check` runs 10 quality rules, JSON output | ✅ First demo        |
| [3](./phases/phase-03-layer-enforcement.md) | Layer Enforcement            | 3 weeks  | YAML manifest → architecture violations          | ✅ Architect demo    |
| [4](./phases/phase-04-tool-adapters.md)     | Delegated Tool Adapters      | 2 weeks  | Clone, security, secret, CVE scans               | ✅ Security demo     |
| [5](./phases/phase-05-persistence.md)       | Persistence & Trend Tracking | 2 weeks  | SQLite-backed scan history                       | ✅ Trend report      |
| [6](./phases/phase-06-api-server.md)        | API Server + Job Queue       | 3 weeks  | HTTP API, async scans, multi-project             | ✅ API demo          |
| [7](./phases/phase-07-web-ui.md)            | Web UI                       | 4 weeks  | Dashboard, explorer, visualiser, config editor   | ✅ Full product demo |
| [8](./phases/phase-08-reporting.md)         | Reporting Engine             | 3 weeks  | All 7 output formats, 6 report types             | ✅ PDF/DOCX export   |
| [9](./phases/phase-09-ci-integrations.md)   | CI/CD Integrations           | 2 weeks  | GitHub Action, GitLab Component, Docker          | ✅ PR decoration     |
| [10](./phases/phase-10-lsp-ide.md)          | LSP + VS Code Extension      | 2 weeks  | Real-time IDE feedback                           | ✅ IDE demo          |
| [11](./phases/phase-11-hardening.md)        | Hardening, Docs, GA          | 3 weeks  | Perf, security audit, full docs                  | ✅ **Launch**        |

**Total: ~32 weeks** with serial execution — but see **Milestone M1** below: only Phases 0–2 are committed; everything after is the continuation track.

## Milestone M1 — Showcase-Ready (end of Phase 2)

> **Maintainer directive (2026-07-18).** The project's primary goals are career value and demonstrated agentic-workflow discipline, not market adoption. Phase 2 therefore ends at a hard milestone: the repo must deliver that value **standing alone**, while keeping continuation open. Tasks DOC-02/DOC-03/DOC-04/OPS-05 in [phase-02](./phases/phase-02-mvp.md) implement it.

M1 is reached when all of the following hold:

1. **Phase 2 exit criteria met** — `argus check` produces real findings, 10 rules live, **Argus scans itself in CI** (dogfooding).
2. **Recruiter tier (DOC-02):** the root README's top is a 30-second surface — what it is, a real terminal demo of Argus scanning itself, and a quality-receipts table where **every claim links to both its mechanism and a real receipt** (config + PR/CI run). Comprehension bar: a technical reader who reads _only_ the README top gets to "this is what it is, this is how it works, this is how the quality was enforced" in about a minute — the _ah, I get it_ test. No unverifiable claims.
3. **Workflow story (DOC-03):** `docs/workflow.md` explains, for someone who has never seen an agentic workflow, how tasks flow (pick → branch → build under gates → independent review → human-only merge → tracker/handover rotation) and how each guardrail contributed production-grade quality — one diagram, plain language, receipts linked.
4. **Developer tier (DOC-04):** `docs/dev/tour.md` — an ordered ~15-minute reading path over the existing docs scaffolding that takes a developer new to the project from zero to a working mental model, ending able to follow the `adding-a-rule` recipe unaided.
5. **Go-public-ready (OPS-05):** every agent-preparable item in the [go-public runbook](../go-public-runbook.md) verified and prepared, so what remains is exactly the maintainer's ~10-minute flip list. **The flip itself stays voluntary, unscheduled, and maintainer-only — M1 does not schedule it.**
6. **Continuation stays open:** Phases 3–11 remain published below as the roadmap's continuation track, and the README frames them as "what's next", never as unfinished debt.

## Continuation Track (Phases 3–11 — optional, post-M1)

Phases 3–11 are **not committed work**. They stay fully specified so that (a) the eventually-public repo shows a thought-through product trajectory and (b) the maintainer can resume at any time with zero re-planning. Picking up Phase 3 after M1 is a maintainer decision recorded in `IMPLEMENTATION.md`, not a default.

## Parallelisation Opportunities

Once Phase 2 (MVP) is complete, several continuation-track phases can run in parallel with sufficient agent capacity:

```
Phase 2 (MVP) ──┬── Phase 3 (Layer Enforcement)
                ├── Phase 4 (Tool Adapters)
                └── Phase 5 (Persistence)
                          │
                          └── Phase 6 (API)
                                    │
                                    ├── Phase 7 (Web UI)
                                    ├── Phase 8 (Reports)
                                    └── Phase 9 (CI Integrations)
                                              │
                                              └── Phase 10 (LSP)
                                                        │
                                                        └── Phase 11 (Hardening)
```

## Dependency Rules Between Phases

- **Phase 0** is foundational. Nothing starts before it.
- **Phase 1** unlocks all rule-development work.
- **Phase 2** is the first demoable milestone and unlocks parallel work.
- **Phase 6** must precede the Web UI (Phase 7) — UI needs the API.
- **Phase 7** must precede the Report Builder UI (part of Phase 8).
- **Phase 11** is the final integration and hardening phase.
