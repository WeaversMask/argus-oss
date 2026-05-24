# Phase 6 — API Server + Job Queue

> **Self-contained phase doc.** When done, set Current Phase to P7 and load [`phase-07-web-ui.md`](./phase-07-web-ui.md).

**Duration:** ~3 weeks
**Demoable:** ✅ API demo — POST a scan via curl, GET results.
**Prerequisites:** Phase 5 complete

---

## Goal

Headless, network-accessible platform. Remote scans, multi-project, async execution via job queue. This unlocks the Web UI (Phase 7) and CI integrations (Phase 9).

---

## Required Reading Before Starting

- [`../00-principles.md`](../00-principles.md) §1 — apps are thin; orchestration belongs in packages
- The trend calculator service from Phase 5

---

## Tasks

### [P6-01] Fastify server bootstrap

- **Deps:** P5 complete
- **Outputs:** `apps/server/src/index.ts`
- **Acceptance:** Server starts, exposes `/health`, structured logging via `pino`
- **Effort:** S

### [P6-02] tRPC routers

- **Deps:** P6-01
- **Outputs:** Routers for projects, scans, violations, suppressions, rules, layers
- **Acceptance:**
  - Type-safe client generated for web UI consumption
  - All routes have Zod input/output validation
- **Effort:** L

### [P6-03] BullMQ integration

- **Deps:** P6-01
- **Outputs:** Job queue setup, scan worker, Redis dependency
- **Acceptance:**
  - Submitting a scan returns a job ID immediately
  - Worker picks up jobs and runs scans
  - Progress streamed back via websocket or SSE
- **Effort:** L

### [P6-04] Worker pool for parallel parsing

- **Deps:** P6-03
- **Outputs:** `packages/workers/` — `worker_threads` pool
- **Acceptance:**
  - Linear speedup up to physical CPU core count
  - Graceful shutdown on worker errors
- **Effort:** L

### [P6-05] Authentication

- **Deps:** P6-01
- **Outputs:** Passport.js with local + OIDC + SAML strategies
- **Acceptance:**
  - Local credentials work for self-hosted
  - OIDC tested against Auth0/Keycloak fixture
  - JWT sessions for API
- **Effort:** L

### [P6-06] Authorization & roles

- **Deps:** P6-05
- **Outputs:** Owner/Editor/Viewer role enforcement on all tRPC routes
- **Acceptance:**
  - Unit tests verify each role's permissions
  - Audit log records all configuration changes
- **Effort:** M

---

## Phase 6 Exit Criteria

- [ ] API demo: POST a scan via curl, GET results, all via authenticated tRPC
- [ ] 50 concurrent scans handled without degradation on M2 hardware
- [ ] Phase handover documents API contracts, auth strategy, and Redis operational notes

---

## Phase-Specific Notes

- **The server is an entry point only.** No business logic. Routes call orchestrators from `packages/orchestrator`. If you're tempted to put logic in a route handler, push it down.
- **tRPC + Zod gives you end-to-end type safety.** The Web UI in Phase 7 will consume the generated client. Don't introduce a parallel REST schema unless you have a non-tRPC consumer.
- **Worker pool concurrency = CPU cores, not memory.** Each tree-sitter parser holds 50-100MB. On 8GB RAM, 6 workers is the sweet spot. Make it configurable.
- **BullMQ retry semantics are critical.** Scan failures should NOT auto-retry by default — failed scans usually indicate a bug, not a transient issue. Opt-in retries only.
- **Auth in self-hosted vs SaaS** diverges quickly. Keep the strategy interface in `packages/core` so both modes share the same authorization checks.

---

## Definition of Done for Phase 6

The next agent can:

1. Start the server with `pnpm dev:server` and hit `/health`
2. Submit a scan via tRPC and poll for completion
3. Authenticate via local credentials or OIDC
4. Start Phase 7 (Web UI) and consume the typed tRPC client immediately
