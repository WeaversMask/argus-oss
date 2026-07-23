# Argus — User Guide

> How to install, run, and configure Argus. **This guide fills in progressively** — a page lands the phase its capability ships (see [`../plan/03-documentation.md`](../plan/03-documentation.md)). Today Argus has no user-facing surface yet (Phase 1, Domain Core), so this is a skeleton.

## Planned pages

Each page is written when its feature first ships, then edited and expanded during Phase 11.

| Page                                     | Covers                                                    | Arrives                                                        |
| ---------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `installation.md`                        | Prerequisites (external tool engines), install, first run | Phase 2 (MVP)                                                  |
| `cli.md`                                 | `argus check` and other commands                          | Phase 2 (MVP)                                                  |
| [`configuration.md`](./configuration.md) | Config file schema and options                            | 🟡 P1-05 (format + inheritance) → grows with the CLI (Phase 2) |
| `layer-manifest.md`                      | Declaring architecture layers and boundaries              | Phase 3                                                        |
| [`rules.md`](./rules.md)                 | The built-in rule catalogue and profiles                  | 🟡 P2-01 (ten TS/JS rules) → grows with profiles + more rules  |
| `reports.md`                             | Output formats and report types                           | Phase 8                                                        |
| `ci.md`                                  | GitHub / GitLab / Docker integration                      | Phase 9                                                        |
| `ide.md`                                 | LSP and VS Code extension                                 | Phase 10                                                       |

## Meanwhile

- **What Argus is and how it's shaped:** [`../architecture.md`](../architecture.md).
- **Contributing / building from source:** [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md).
- **Roadmap:** [`../plan/02-roadmap.md`](../plan/02-roadmap.md).
