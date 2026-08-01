# Documentation Standard & Progressive Capture

> **Load on demand** when a task might produce documentation (most do) or when deciding where a doc belongs. Governs how documentation is written _continuously_ so the Phase 11 deliverable is assembly, not archaeology.

## Why this exists

Argus is built to be open-sourced. A reader who lands on the repo should be able to:

1. **Understand** the product — what it does and how it is shaped.
2. **Trust** it — see the decisions, the security posture, and the guardrails.
3. **Maintain** it — get productive on the internals after reasonable effort.
4. **Reuse** it — take the parts they want (MIT; see [`../../LICENSE`](../../LICENSE)).

The full documentation _site_ is a Phase 11 deliverable ([`P11-03`](./phases/phase-11-hardening.md)), and most of its reference material is **generated from source** (rule reference from TSDoc, API docs from tRPC schemas). Writing it all at the end is archaeology — the rationale is freshest the moment the code is written. So documentation is **captured progressively, in the cheapest durable form closest to the code**, and Phase 11 _assembles and polishes_ what already exists.

**Principle:** capture now in portable Markdown + TSDoc; commit to no site tooling until Phase 11.

## The capture streams

Each reader goal maps to a stream with a fixed home and a capture trigger. Fill the stream when its trigger fires — not before, not at the end.

| Reader goal           | Stream                             | Home                                                | Capture trigger                                         |
| --------------------- | ---------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Understand            | User guide                         | [`../guide/`](../guide/)                            | A user-facing capability ships (Phase 2+)               |
| Understand + Maintain | Architecture map                   | [`../architecture.md`](../architecture.md)          | The package graph or a boundary changes                 |
| Understand + Maintain | Per-package "what / why / surface" | `packages/<pkg>/README.md`, `apps/<app>/README.md`  | A package is created, or its public surface changes     |
| Maintain              | Contributor recipes                | [`../dev/`](../dev/)                                | The **first** instance of a repeatable pattern is built |
| Trust                 | Decision rationale                 | [`../adr/`](../adr/)                                | An architectural decision is made                       |
| Reuse / Understand    | Reference (API, rules, config)     | **TSDoc on public exports** → generated at Phase 11 | Any public export is added or changed                   |

Trust also rests on assets that already exist — [`../../LICENSE`](../../LICENSE) (MIT), [`../../SECURITY.md`](../../SECURITY.md), [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) (licensing guardrails), [`../../THIRD-PARTY-NOTICES`](../../THIRD-PARTY-NOTICES), and the ADRs. This standard **links to** them; it does not duplicate them.

## Where a given doc goes

- **"What is this package, why does it exist, what's its public surface?"** → the package's own `README.md` (use [`templates/README.package.template.md`](./templates/README.package.template.md)). This is the _intimate_ layer — written while you are already deep in that package's context.
- **"How do the packages fit together?"** → [`../architecture.md`](../architecture.md). The connective tissue no single README carries.
- **"How do I use Argus / run this command / write this config?"** → [`../guide/`](../guide/).
- **"How do I add another rule / adapter / report formatter / persistence backend?"** → [`../dev/`](../dev/), one recipe per pattern, extracted the first time you build that pattern.
- **"Why is it done this way?"** → an ADR in [`../adr/`](../adr/).
- **"What does this exported function/type do?"** → a TSDoc comment on the export itself.

## Reference is TSDoc-first

Public exports carry TSDoc as they are written. This is the single highest-leverage habit: it doubles as in-editor help for maintainers now and as the **source** for the Phase 11 generated reference (rule catalogue, API docs). A public export without TSDoc is an undocumented public surface — treat it as incomplete, not as a Phase 11 to-do.

## The per-task obligation — "Documentation delta"

Every task records a **documentation delta** as part of the [Task Completion Checklist](./protocols/agentic-execution.md). It is **required, or an explicit "no docs delta" with a one-line reason** — the same discipline as the ADR line, and for the same reason: a forced, conscious decision every task is what makes documentation actually accumulate. A soft reminder does not.

A task's documentation delta is satisfied when, _for each stream its change touched_:

- Any package it created or whose public surface it changed has a **current `README.md`**.
- Any public export it added or changed **carries TSDoc**.
- Any user-facing capability it shipped is reflected in [`../guide/`](../guide/).
- Any repeatable pattern it introduced for the first time has a [`../dev/`](../dev/) recipe.
- Any architectural decision it made has an [ADR](../adr/).

If the change touched none of these (e.g. an internal refactor with no surface or behaviour change), record **"no docs delta"** with a one-line reason. That is a valid, complete answer.

**Scope discipline:** the ongoing cost is meant to be small — a README when a package is born, a TSDoc line when you export, a guide paragraph when a feature ships. No site, no polish, no tooling here. Those are Phase 11.

## Cadence — specced as DOC-05, not yet installed

The obligation above is **per task and enforced by prose alone**: nothing checks that a delta was recorded, and nothing above the task tier keeps the structure honest as phases close. Two things close that, both specced as [`DOC-05`](./phases/phase-02-mvp.md) in the Phase 2 showcase tail:

- **Per merged task (small, iterative):** the documentation delta becomes a mechanical CI gate rather than a checklist line, plus one short plain-language entry in `docs/progress.md` — the **third-party tier**, deliberately separate from `IMPLEMENTATION.md`, whose task rows are agent-facing forensics and are not a progress surface anyone outside the project can read.
- **Per completed phase (comprehensive):** a documentation consolidation pass against a fixed checklist — architecture map re-verified against the real package graph, every README, guide page, recipe, and ADR reconciled — which a phase must pass **before** it can be marked ✅ Complete.

Until DOC-05 lands, this page is the whole standard and the delta remains an honour-system checklist item.

## Assembly at Phase 11 (what this feeds)

[`P11-03`](./phases/phase-11-hardening.md) does **not** write documentation from scratch. It assembles and polishes what these streams have already captured:

- Package READMEs + [`../architecture.md`](../architecture.md) → the architecture section.
- TSDoc → generated rule reference and API docs.
- [`../guide/`](../guide/) → the user guide, edited and expanded.
- [`../dev/`](../dev/) → contributor guide and recipes.
- [`../adr/`](../adr/) → the decision-record index.

If every stream has been fed along the way, Phase 11 is editing and wiring a site — not remembering how the system was built.

## Related

- [`00-principles.md`](./00-principles.md) — engineering principles
- [`01-repo-structure.md`](./01-repo-structure.md) — where code goes (mirror of the doc homes here)
- [`protocols/agentic-execution.md`](./protocols/agentic-execution.md) — the checklist this obligation lives in
- [`phases/phase-11-hardening.md`](./phases/phase-11-hardening.md) — the assembly target
