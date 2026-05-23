# Phase 5 — Persistence & Trend Tracking

> **Self-contained phase doc.** When done, set Current Phase to P6 and load [`phase-06-api-server.md`](./phase-06-api-server.md).

**Duration:** ~2 weeks
**Demoable:** ✅ Trend report — run two scans; show the delta.
**Prerequisites:** Phase 4 complete

---

## Goal

Scan results persist; trends can be calculated; suppressions work across runs. SQLite is the default backend; Postgres is a drop-in replacement via config.

---

## Required Reading Before Starting

- [`../01-repo-structure.md`](../01-repo-structure.md) — `packages/persistence` layout
- All repository port interfaces in `packages/core/src/ports/`

---

## Tasks

### [P5-01] Schema design and migration system
- **Deps:** P4 complete
- **Outputs:** `packages/persistence/migrations/`, tooling (`umzug` or `drizzle-kit`)
- **Acceptance:**
  - Forward and backward migrations
  - Migrations run on startup if a schema version mismatch is detected
- **Effort:** M

### [P5-02] SQLite implementations of all repository ports
- **Deps:** P5-01
- **Outputs:** `packages/persistence/sqlite/`
- **Acceptance:**
  - All `*RepositoryPort` interfaces from `core` have SQLite implementations
  - Contract tests against in-memory port fakes verify behavioural equivalence
- **Effort:** L

### [P5-03] Postgres implementations (mirror)
- **Deps:** P5-02
- **Outputs:** `packages/persistence/postgres/`
- **Acceptance:**
  - Schema parity with SQLite
  - Contract tests pass identically
- **Effort:** M

### [P5-04] Trend calculator service
- **Deps:** P5-02
- **Outputs:** Service in `packages/core/src/services/trend-calculator.ts`
- **Acceptance:**
  - Computes deltas between scans (added, fixed, persistent violations)
  - Time-series aggregation for charts (daily, weekly, monthly buckets)
- **Effort:** M

### [P5-05] Suppression system
- **Deps:** P5-02
- **Outputs:** Inline suppression parsing + repository-stored suppressions
- **Acceptance:**
  - `// argus-ignore: RULE_ID reason="link"` parsed correctly
  - Suppressions tracked with author, date, and optional expiry
  - Expired suppressions automatically surface in next scan
- **Effort:** M

---

## Phase 5 Exit Criteria

- [ ] Run two scans; trend delta shown
- [ ] Suppressions survive across scans
- [ ] Database persistence layer fully swappable (SQLite ↔ Postgres via config only)
- [ ] Phase handover documents schema, migration policy, and known limits

---

## Phase-Specific Notes

- **SQLite + WAL mode** is the right default. Enables concurrent reads while writing. Set `PRAGMA journal_mode = WAL` on connection open.
- **`better-sqlite3`** is synchronous. This is a feature, not a bug — it pairs well with CLI use. For the server (Phase 6) the synchronous API still works since BullMQ workers run in separate threads.
- **Migrations must be backwards-compatible during deploy.** A new version of the server should run against the old schema until migrations complete. Avoid destructive migrations entirely; deprecate columns rather than dropping them.
- **Postgres schema parity** is hard to maintain by hand. Consider `drizzle-orm` which generates both. Or document the rule that any SQLite migration must come with a Postgres equivalent in the same PR.
- **Trend calculation is pure given scan data.** Keep it in `core/services` so the API and UI both use the same logic.

---

## Definition of Done for Phase 5

The next agent can:
1. Run a scan and see results persisted; run again and see the delta
2. Add a suppression and watch it apply to the next scan
3. Switch the storage backend by changing a single config line
4. Start Phase 6 with full persistence in place
