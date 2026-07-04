# ADR-0001 — Monorepo with pnpm Workspaces and Turborepo

**Status:** Accepted
**Date:** 2026-05-23 (drafted with the initial scaffolding) · reconciled and dated 2026-07-04 (P0-08)
**Decision makers:** Maintainer (solo; in effect since P0-01, ratified by fourteen tasks built on it)

---

## Context

Argus comprises multiple deployable applications (CLI, server, web UI, LSP, VS Code extension) and many internal libraries (core, rule engine, adapters, persistence, reports, etc.). These share types, schemas, and contracts. Repository structure must:

- Allow type-safe sharing between packages (a change to a `core` domain type immediately surfaces in all consumers)
- Support independent versioning of public packages
- Enable fast, cached builds across packages
- Keep developer experience smooth (one `pnpm install` from the root)
- Work on Apple Silicon, x86 Linux, and Windows (via WSL)

## Options Considered

### Option A: Polyrepo (one repository per package)

- ✅ Clear ownership boundaries
- ✅ Independent CI per package
- ❌ Cross-package changes require coordinated PRs
- ❌ Internal version churn becomes painful
- ❌ Type-safe sharing requires publishing to a registry first

### Option B: Monorepo with npm workspaces + custom scripts

- ✅ Single repo, easy onboarding
- ✅ Native npm — no new tools
- ❌ npm workspaces are slow for large repos
- ❌ No build caching out of the box
- ❌ Lock file performance issues at scale

### Option C: Monorepo with pnpm workspaces + Turborepo (chosen)

- ✅ pnpm is the fastest, most efficient package manager for monorepos (content-addressable storage)
- ✅ Turborepo provides build caching, parallelisation, and dependency-aware task running
- ✅ Type-safe workspace protocol references (`workspace:*`)
- ✅ Remote caching available via Vercel or self-hosted
- ❌ Two tools to learn (mild)

### Option D: Monorepo with Nx

- ✅ More features than Turborepo (code generators, plugin system)
- ✅ Mature, battle-tested at scale
- ❌ Heavyweight; opinionated
- ❌ More moving parts than the project needs

## Decision

**Adopt Option C: pnpm workspaces + Turborepo.**

Rationale:

- pnpm + Turborepo is the de facto standard for modern TypeScript monorepos
- Lighter weight than Nx with sufficient features for this project's scale
- Remote caching unlocks fast CI without expensive build infrastructure
- Strong community and documentation

## Consequences

### Positive

- Type changes propagate instantly across packages
- Single `pnpm install` from root sets up the entire workspace
- Turborepo cache hits cut CI time by ~80% on incremental changes
- Workspace protocol enables internal references without publishing

### Negative

- New contributors need to learn pnpm-specific commands (`pnpm add -F <package>` instead of `npm install` in a sub-folder)
- Remote cache requires either Vercel account or self-hosted infrastructure
- Some tools (older Jest configs, certain bundlers) have quirks with pnpm's symlink-based `node_modules`

### Neutral

- Future migration to Nx is feasible if the project outgrows Turborepo

## Pinned Versions

> Reconciled 2026-07-04 (P0-08): the draft predated the supply-chain baseline.

- `pnpm` — **exact-pinned** in root `package.json` → `packageManager` (11.5.3 at reconciliation; the pinning _policy_ — exact version, 3-day minimum release age, install scripts blocked — is [ADR-0003](./0003-supply-chain-hardening-baseline.md))
- `turbo@2.x` (root devDependency)
- CI Node is concretely pinned via `NODE_VERSION` in `ci.yml` (P0-13); local floor is `engines.node`

## Related ADRs

- [ADR-0002 — Third-Party Integration & Open-Source Licensing Policy](./0002-third-party-integration-and-licensing-policy.md)
- [ADR-0003 — Supply-Chain Hardening Baseline](./0003-supply-chain-hardening-baseline.md) — supersedes this file's original `pnpm@9.x` note

## References

- pnpm workspaces: https://pnpm.io/workspaces
- Turborepo: https://turbo.build/repo
