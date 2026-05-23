# Repository & Code Structure

> **Load on demand** when creating new files or unsure where something belongs.

A **pnpm workspaces monorepo** managed with **Turborepo** for build orchestration and caching.

```
argus/
│
├── apps/                            # Deployable applications (entry points only)
│   ├── cli/                         # `argus` CLI binary
│   ├── server/                      # HTTP API + job processor
│   ├── web/                         # React web UI
│   ├── lsp/                         # Language Server
│   └── vscode-extension/            # VS Code extension wrapping the LSP
│
├── packages/                        # Internal libraries
│   ├── core/                        # ★ Domain. Zero infrastructure dependencies.
│   │   └── src/
│   │       ├── domain/              # Entities & value objects
│   │       ├── ports/               # Interfaces only — implemented by adapters
│   │       ├── services/            # Domain services (pure logic)
│   │       └── errors/
│   │
│   ├── rule-engine/                 # Rule dispatch & AST walking
│   ├── rules-builtin/               # The shipped catalogue of rules
│   ├── layer-enforcer/              # Architecture conformance checking
│   ├── dependency-graph/            # Import graph construction
│   ├── ast/                         # Tree-sitter wrapper + ESTree bridge
│   ├── config/                      # Config schema & loading
│   │
│   ├── adapters/                    # External tool adapters
│   │   ├── jscpd/
│   │   ├── semgrep/
│   │   ├── trufflehog/
│   │   ├── osv/
│   │   ├── license-checker/
│   │   ├── prettier/
│   │   └── _shared/
│   │
│   ├── persistence/                 # Data access layer
│   │   └── src/
│   │       ├── sqlite/
│   │       ├── postgres/
│   │       ├── migrations/
│   │       └── factory.ts
│   │
│   ├── orchestrator/                # Scan execution orchestration
│   ├── workers/                     # Worker pool for parallel parsing
│   │
│   ├── reports/                     # Report generation
│   │   └── src/
│   │       ├── ports/
│   │       ├── builders/            # ScanSummary, Architecture, Security, etc.
│   │       └── formatters/          # pdf/, docx/, html/, csv/, json/, sarif/, markdown/
│   │
│   ├── ci-adapters/                 # github/, gitlab/, bitbucket/
│   ├── api-contracts/               # tRPC routers + shared types
│   ├── ui-components/               # Shared React components
│   └── testing/                     # Test utilities, fixtures, builders, fakes
│
├── docs/
│   ├── README.md
│   ├── IMPLEMENTATION.md
│   ├── HANDOVER.md
│   ├── risks.md
│   ├── plan/                        # phase docs, protocols, templates
│   ├── adr/                         # Architecture Decision Records
│   └── handovers/                   # Historical handover snapshots
│
├── scripts/
├── .github/
├── docker/
├── .changeset/
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
└── README.md
```

## Where Things Go — Quick Lookup

| If you're adding... | It goes in... |
|---|---|
| A new domain concept (e.g. `Severity`) | `packages/core/src/domain/` |
| A new port (interface) | `packages/core/src/ports/` |
| A new built-in rule | `packages/rules-builtin/src/<category>/` |
| A new external tool wrapper | `packages/adapters/<tool-name>/` |
| A new SQLite repository | `packages/persistence/src/sqlite/` |
| A new report format | `packages/reports/src/formatters/<format>/` |
| A new CLI command | `apps/cli/src/commands/` |
| A new tRPC router | `apps/server/src/routes/` and `packages/api-contracts/src/routers/` |
| A new React page | `apps/web/src/pages/` |
| A new shared UI primitive | `packages/ui-components/src/primitives/` |
| A test data builder | `packages/testing/src/builders/` |
| An in-memory port fake | `packages/testing/src/mocks/` |

## Why This Structure

- **Apps are thin.** They wire adapters and call orchestrators. Zero business logic.
- **`core` is the gravitational centre.** Everything depends on it; it depends on nothing.
- **Adapters are swappable.** Replacing `tree-sitter` with `swc` means touching one package.
- **`persistence/sqlite` and `persistence/postgres` are interchangeable.** Factory picks based on config.
- **Reports are self-contained.** New format = one new folder under `formatters/`.
- **`testing` package is consumed only by other packages' tests.** Builders and fakes shared, not duplicated.

## Forbidden Imports (Enforced by Dogfooding)

Once the platform can scan itself (Phase 2), these become enforced rules:

| From | May NOT import from |
|---|---|
| `packages/core/*` | Any other package |
| `packages/rule-engine` | `apps/*`, `packages/persistence/*`, `packages/adapters/*` |
| `packages/rules-builtin` | `apps/*`, `packages/persistence/*` |
| `packages/persistence/*` | `apps/*` |
| Any `packages/*` | `apps/*` |
