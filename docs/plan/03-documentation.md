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

## Cadence — two tiers, both mechanical

The obligation above was, until DOC-05, **per task and enforced by prose alone**: nothing checked that a delta was recorded, and nothing above the task tier kept the structure honest as phases closed. That is the same shape of gap OPS-06 closed for `THIRD-PARTY-NOTICES`, where tracker rows asserted a freshness claim against no mechanism at all. Two tiers close it.

### Per merged task — small, iterative, gated by CI

**1. The documentation delta is a CI gate, not a checklist line.** The `Documentation delta` job in [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml) fails a non-draft PR that changes source while touching no documentation surface. Drafts and bot-authored PRs are exempt; it fails closed, and it applies from its merge forward — it never retro-judges already-merged work.

- **Source** — `packages/*/**/src/**`, `apps/*/src/**`, `scripts/**`. Note the doubled wildcard: **packages nest.** `packages/adapters/prettier/` is already two segments deep and Phase 4 grows that family, so a single-segment pattern silently exempts every adapter — which is exactly what the first version of this gate did, until the review caught it.
- **Documentation surface** — `docs/**`, any `README.md`, any root-level `*.md`. That covers five of the six capture streams above.
- **TSDoc, the sixth stream, lives _inside_ source**, so no path match can find it. The gate therefore inspects the diff **content**: a changed doc-comment line (`/**`, a `*` continuation, `*/`) in a source file satisfies it. `//` line comments deliberately do not count — counting them would pass nearly every diff and gut the gate. This was ruled explicitly rather than left implicit, because the alternative — a path-only gate — forces a false "no docs delta" onto a TSDoc-only PR, and **a gate you must lie to in order to pass trains exactly the reflex it exists to prevent**. The workflow comment records the accepted imprecisions in both directions.
- **The escape hatch, when a change genuinely has no delta:** a line in the PR description reading

  > no docs delta — &lt;one-line reason&gt;

  The reason is mandatory; the bare phrase does not pass. This is the same answer §"The per-task obligation" already allowed, now written where a machine can read it. The job's error message prints the line, and it is deliberately **not** pre-printed in [`templates/PR.template.md`](./templates/PR.template.md) — an unedited template must fail, never pass vacuously.

**2. One entry in [`../progress.md`](../progress.md).** Dated, PR-linked, ≤5 lines of plain language, answering _what can be done now that could not before_. This is the **third-party tier**, deliberately separate from `IMPLEMENTATION.md`, whose task rows are agent-facing forensics — the right depth for the next picker, and unreadable for anyone asking what the project has delivered.

The three progress surfaces, so they never collapse into each other:

| Surface             | Reader            | Content                                                      |
| ------------------- | ----------------- | ------------------------------------------------------------ |
| `IMPLEMENTATION.md` | the next agent    | current state, gotchas, forensics                            |
| `progress.md`       | a human visitor   | what shipped, when, in plain language                        |
| `CHANGELOG.md`      | a dependency user | **generated by changesets** per package — never hand-written |

### Per completed phase — comprehensive, gated by the phase exit criteria

A **documentation consolidation pass** against [`templates/PHASE-DOC-AUDIT.template.md`](./templates/PHASE-DOC-AUDIT.template.md): the architecture map re-verified against the real package graph (dependency-cruiser's counts are the oracle, so drift is _measured_), every package README checked against its actual `exports`, every guide page, recipe and ADR reconciled, every relative link resolved, and the phase's `progress.md` section read end to end as a story.

- The report is committed under [`../audits/`](../audits/) as `phase-<NN>-doc-audit.md`.
- **A phase cannot be marked ✅ Complete until its pass reads ✅ pass.** This is carried as an exit criterion in every phase file from Phase 2 onward, not only here — a gate that lives solely in a protocol is a gate the phase transition can forget.
- Every finding is fixed in the audit's own PR or filed as its own task. A "known stale" line left standing is a failed audit; a first report that finds nothing is evidence the pass was not really run.

The first pass was executed against Phase 2 itself — [`../audits/phase-02-doc-audit.md`](../audits/phase-02-doc-audit.md) — so the cadence proved itself on the phase that installed it rather than shipping as an untested checklist.

### A published metric needs a mechanism that keeps it true

The rule this standard keeps running into: **do not publish a number unless something re-measures it.** A figure a human types is correct on the day it is typed and silently wrong afterwards, and the more prominently it is displayed the longer it stays believed. Two standing applications, recorded here because they otherwise live only in documents that expire:

- **README badges.** CI and License went live on 2026-08-10. **Coverage and mutation are deliberately absent, and adding either means doing the work, not adding a line.** Coverage needs a service (Codecov/Coveralls) wired before shields.io can read it; until then the enforced floors in [`../../vitest.config.ts`](../../vitest.config.ts) are the honest claim. Mutation has no score to publish while the weekly Stryker job is red (since 2026-07-28) — fix the job first. This is DOC-02's own precedent for keeping mutation score out of the README's receipts table.
- **Figures quoted in prose.** Anchor them to something immutable — a linked CI run, or an explicit recording date — rather than leaving a bare number. The README's self-scan recording carries its date for exactly this reason: the file count it shows was true when recorded and climbs as the repo grows.

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
