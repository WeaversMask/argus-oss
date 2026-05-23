# Roadmap Overview

> **Load on demand** when planning cross-phase work or assessing overall progress.
> For the active phase, load only its phase file from [`phases/`](./phases/).

## Phases at a Glance

| # | Phase | Duration | Delivers | Demoable? |
|---|---|---|---|---|
| [0](./phases/phase-00-foundation.md) | Foundation & Tooling | 2 weeks | Monorepo, CI, conventions, docker | No |
| [1](./phases/phase-01-domain-core.md) | Domain Core & Rule Engine | 3 weeks | Pure domain model + dispatch engine | Unit tests only |
| [2](./phases/phase-02-mvp.md) | **MVP** — CLI + Basic Rules | 3 weeks | `argus check` runs 10 quality rules, JSON output | ✅ First demo |
| [3](./phases/phase-03-layer-enforcement.md) | Layer Enforcement | 3 weeks | YAML manifest → architecture violations | ✅ Architect demo |
| [4](./phases/phase-04-tool-adapters.md) | Delegated Tool Adapters | 2 weeks | Clone, security, secret, CVE scans | ✅ Security demo |
| [5](./phases/phase-05-persistence.md) | Persistence & Trend Tracking | 2 weeks | SQLite-backed scan history | ✅ Trend report |
| [6](./phases/phase-06-api-server.md) | API Server + Job Queue | 3 weeks | HTTP API, async scans, multi-project | ✅ API demo |
| [7](./phases/phase-07-web-ui.md) | Web UI | 4 weeks | Dashboard, explorer, visualiser, config editor | ✅ Full product demo |
| [8](./phases/phase-08-reporting.md) | Reporting Engine | 3 weeks | All 7 output formats, 6 report types | ✅ PDF/DOCX export |
| [9](./phases/phase-09-ci-integrations.md) | CI/CD Integrations | 2 weeks | GitHub Action, GitLab Component, Docker | ✅ PR decoration |
| [10](./phases/phase-10-lsp-ide.md) | LSP + VS Code Extension | 2 weeks | Real-time IDE feedback | ✅ IDE demo |
| [11](./phases/phase-11-hardening.md) | Hardening, Docs, GA | 3 weeks | Perf, security audit, full docs | ✅ **Launch** |

**Total: ~32 weeks** with serial execution.

## Parallelisation Opportunities

Once Phase 2 (MVP) is complete, several phases can run in parallel with sufficient agent capacity:

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
