# Argus — Documentation Index

> Navigation hub. Read this first if you're cold-starting.

## For Agents Starting a Session

**Always load (every session):**

1. [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) — current state, what's in progress
2. [`HANDOVER.md`](./HANDOVER.md) — context from the previous session
3. [`plan/00-principles.md`](./plan/00-principles.md) — non-negotiable engineering rules
4. [`plan/protocols/agentic-execution.md`](./plan/protocols/agentic-execution.md) — how to pick up work

**Then load only the active phase:**

- See `IMPLEMENTATION.md` → "Current Phase" field
- Open `plan/phases/phase-XX-<name>.md`

**Load on demand:**

- [`SECURITY-NOTES.md`](./SECURITY-NOTES.md) — **read once before your first commit**; what must never be committed
- [`plan/01-repo-structure.md`](./plan/01-repo-structure.md) — when creating new files or unsure where something goes
- [`plan/02-roadmap.md`](./plan/02-roadmap.md) — when planning cross-phase work
- [`plan/03-documentation.md`](./plan/03-documentation.md) — when a task may produce documentation (the progressive-docs standard)
- [`plan/protocols/quality-gates.md`](./plan/protocols/quality-gates.md) — before opening a PR
- [`risks.md`](./risks.md) — when a new risk is identified
- [`adr/`](./adr/) — when a design decision conflicts with an existing one

---

## Document Map

```
argus/
├── .gitignore                       strict ignore rules (committed at repo root)
│
└── docs/
    ├── README.md                    ← you are here
    ├── IMPLEMENTATION.md            live tracker (current state)
    ├── HANDOVER.md                  active handover (rotates per task)
    ├── progress.md                  what shipped and when, for a human visitor
    ├── SECURITY-NOTES.md            what must never be committed
    ├── architecture.md              how the packages fit together (reader map)
    ├── workflow.md                  how the work is done (loop, guardrails, receipts)
    ├── risks.md                     risk register
    ├── go-public-runbook.md         the maintainer-only publication procedure
    ├── guide/                       user-facing guide (fills in from Phase 2)
    ├── dev/                         contributor/maintainer recipes
    │   └── tour.md                  15-minute ordered read of the codebase
    ├── audits/                      per-phase documentation consolidation reports
    ├── adr/                         architecture decision records
    ├── handovers/                   archived handover snapshots
    └── plan/
        ├── 00-principles.md         engineering principles (always load)
        ├── 01-repo-structure.md     code structure (load on demand)
        ├── 02-roadmap.md            phase overview table (load on demand)
        ├── 03-documentation.md      progressive-docs standard + cadence (on demand)
        ├── phases/                  one file per phase (load active only)
        │   ├── phase-00-foundation.md
        │   ├── phase-01-domain-core.md
        │   ├── phase-02-mvp.md
        │   ├── phase-03-layer-enforcement.md
        │   ├── phase-04-tool-adapters.md
        │   ├── phase-05-persistence.md
        │   ├── phase-06-api-server.md
        │   ├── phase-07-web-ui.md
        │   ├── phase-08-reporting.md
        │   ├── phase-09-ci-integrations.md
        │   ├── phase-10-lsp-ide.md
        │   └── phase-11-hardening.md
        ├── protocols/
        │   ├── agentic-execution.md execution workflow (always load)
        │   └── quality-gates.md     PR / phase / release gates
        └── templates/
            ├── HANDOVER.template.md
            ├── TASK.template.md
            ├── PR.template.md
            ├── README.package.template.md
            └── PHASE-DOC-AUDIT.template.md
```

---

## For Humans

- **What has shipped, and when** → [`progress.md`](./progress.md).
- **Using Argus** → [`guide/`](./guide/) (fills in from Phase 2).
- **How it fits together** → [`architecture.md`](./architecture.md).
- **How it was built, and why the output can be trusted** → [`workflow.md`](./workflow.md).
- **Working on the internals** → [`dev/tour.md`](./dev/tour.md) first, then [`dev/`](./dev/) and the package's own `README.md`.

New contributor? Read these in order:

1. [`plan/00-principles.md`](./plan/00-principles.md)
2. [`plan/01-repo-structure.md`](./plan/01-repo-structure.md)
3. [`plan/02-roadmap.md`](./plan/02-roadmap.md)
4. [`plan/protocols/agentic-execution.md`](./plan/protocols/agentic-execution.md)

Then dive into the current phase via `IMPLEMENTATION.md`.
