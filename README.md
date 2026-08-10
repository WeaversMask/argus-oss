# Argus

[![CI](https://github.com/WeaversMask/argus-oss/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/WeaversMask/argus-oss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status: pre-1.0, not published](https://img.shields.io/badge/status-pre--1.0%20%C2%B7%20not%20published-orange)](#status)
[![Last commit](https://img.shields.io/github/last-commit/WeaversMask/argus-oss)](https://github.com/WeaversMask/argus-oss/commits/main)

[![TypeScript: strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.base.json)
[![Node engines requirement](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FWeaversMask%2Fargus-oss%2Fmain%2Fpackage.json&query=%24.engines.node&label=node&color=339933&logo=nodedotjs&logoColor=white)](package.json)
[![Parser: tree-sitter](https://img.shields.io/badge/parser-tree--sitter-4B8BBE)](docs/adr/0005-ast-adapter-wasm-tree-sitter.md)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4?logo=prettier&logoColor=white)](.prettierrc.json)
[![Commits: Conventional](https://img.shields.io/badge/commits-conventional-fe5196?logo=conventionalcommits&logoColor=white)](commitlint.config.cjs)

<!-- Badge inclusion rule, in three tiers. Work out which tier a new badge falls
     in before adding it; do not assume every badge here is gate-backed, because
     three are not.
       LIVE    — re-measure themselves, so they cannot drift: CI, last-commit,
                 and node (shields parses engines.node out of package.json on
                 main, so it IS the file rather than a copy of it).
       GATED   — a build fails the day they stop being true: TypeScript strict
                 (typecheck across all 10 packages), Prettier (format:check),
                 Conventional Commits (commitlint).
       STATED  — true, but nothing in CI asserts them: License, status, and
                 tree-sitter. license-check audits third-party dependency
                 licences, never the root LICENSE; nothing fails if a manifest
                 stops being private@0.0.0; an ADR is a document. They are safe
                 because they change only by deliberate act — and they are the
                 tier to re-check by hand when such an act happens.
     The "Field results" table below is split across two of these tiers, and
     which half you are looking at matters.
       Its PROSE is GATED: `field-results:check` runs in the lint job and
                 recomputes every figure from docs/field-results.json, so the
                 text cannot drift from the snapshot it quotes.
       Its NUMBERS are STATED: nothing re-measures them, because measuring
                 means fetching third-party repos and that is manual by
                 maintainer ruling 2026-08-10 (see scripts/field-scan.mjs).
     The targets are SHA-pinned, so their side cannot drift — but OUR side moves
     on more than a rule edit, and the trigger list is wider than it first
     looks: anything under packages/rules-builtin (rule logic or a default
     threshold), packages/rule-engine, packages/core, apps/cli/src/discover.ts
     (which decides what counts as a file at all), and packages/ast — including
     a tree-sitter version bump, which arrives as a Dependabot PR and so is
     exempt from docs-delta. That last one moves "0 parse failures", the column
     the section calls the one that matters. The re-check is `pnpm
     field-scan:check`; it needs the network, which is why it is not the gate.
     Deliberately absent: coverage %, test count, rule count. A binary property
     can be held up by a gate; a NUMBER cannot. An ungated number is how the demo
     recording below came to claim 151 files against an actual 161. See
     docs/plan/03-documentation.md §"A published metric needs a mechanism that
     keeps it true". Coverage becomes honest the day a service is wired.
     Known soft failure: if shields cannot fetch package.json, the node badge
     renders "node: resource not found" as a valid HTTP 200 SVG — nothing in CI
     would notice, because no job checks README links or badges. -->

**Argus is a deterministic, architecture-aware code-quality scanner for TypeScript monorepos.** It parses your source with tree-sitter, applies explicit rules to the syntax tree, and reports exactly what it found — as readable console output or as a schema-validated JSON document for CI.

- **No model in the scan path.** Same commit in, same findings out — every time. Rule results are sorted by a total order and re-serialise byte-identically, so a diff in CI means your code changed, not that the weather did.
- **Architecture is enforced, not documented.** "The domain core may not import an adapter", "no package may reach into another's internals", "`packages/` may not import `apps/`" are dependency-cruiser rules that fail the build — and each one was negative-tested: deliberately violated to prove it actually fires, then reverted.
- **Built by AI agents, under gates that don't take their word for it.** Every task is one branch and one PR; a second agent reviews the diff — from a different model family wherever the roster allows, because a same-model reviewer rationalises past what an independent one catches — and CI fails the PR if that review is missing. Only the human maintainer merges. The receipts are below.

## Argus scanning Argus

Argus's own CI runs Argus over this repository on every pull request and fails if it finds anything. Both frames below are real output, recorded 2026-08-01 — the second was produced by adding one file that breaks four rules, scanning, and deleting it. Those file counts are the recording's, and climb as the repo grows; what keeps the claim true today is the `dogfood` job in [`ci.yml`](.github/workflows/ci.yml), not this image:

![Terminal recording from 2026-08-01: pnpm -s argus check . reports no violations across 151 files, then catches four violations across four rules after one bad file is added](docs/assets/argus-self-scan.svg)

Ten built-in rules ship today, covering complexity, function and file length, nesting depth, dead code, naming, import order, wildcard imports, JSDoc on exports, and empty tests — see the [rule reference](docs/guide/rules.md). `argus fix` can repair import order in place; the rest report only, by design ([ADR-0006](docs/adr/0006-autofix-representation-and-safety.md) explains why nine of the ten are not safely auto-fixable).

## Field results — Argus on code it didn't write

Dogfooding proves Argus clears its own bar, but this repo's code was written to pass it. The harder question is what happens against source nobody here wrote. Three well-known TypeScript projects, each pinned to an exact commit and scanned whole at the repo root with no configuration — what `argus check .` gives anyone:

| Project                                      | Commit    | Files | Violations | Parse failures | Scan |
| -------------------------------------------- | --------- | ----- | ---------- | -------------- | ---- |
| [zod](https://github.com/colinhacks/zod)     | `ead9fcb` | 381   | 3,225      | **0**          | 2.3s |
| [ky](https://github.com/sindresorhus/ky)     | `3419113` | 53    | 64         | **0**          | 0.7s |
| [zustand](https://github.com/pmndrs/zustand) | `beca84e` | 30    | 25         | **0**          | 0.4s |

**The column that matters is parse failures.** 464 files of other people's TypeScript — zod's v3 and v4 source, its benchmark suite, a Next.js docs site — parsed without a single failure, zod's 381 of them in 2.3 seconds. Robustness against code you did not write is precisely what dogfooding cannot demonstrate, and it is the prerequisite for every other claim on this page.

**The violation counts are not defect counts, and reading them that way would be wrong.** They measure distance from Argus's unconfigured defaults. Of zod's 3,225, **2,817 — 87% — come from four convention rules**: naming (1,413), required JSDoc (1,005), wildcard imports (388), import order (11). zod deliberately uses lowercase type aliases (`inferFlattenedErrors`) and `$`-prefixed internals (`$ZodString`), where Argus's defaults want PascalCase types and camelCase constants. Neither party is wrong, and configuring that away is what a `rules:` block in [`argus.yaml`](docs/guide/configuration.md) is for.

The other **408 are structural** — function length (250), cyclomatic complexity (95), file length (53), nesting depth (8), empty tests (2). Those transfer across house styles, because no naming convention makes a 15-branch function easy to read. **The ratio is not stable, and it does not track size**: 86% of ky's 64 findings are structural, while zustand — smaller again, at 30 files — runs the other way at 60% convention. Which is the argument for reading the split rather than the total.

The `Scan` column is wall clock on one laptop, and is the one figure here that nothing re-checks; treat it as an indication, not a benchmark.

These numbers are a **dated measurement, not a live one** — taken 2026-08-10 with Argus at `033ca2c`, and re-measured by hand rather than by CI:

```bash
pnpm field-scan
```

Each target is pinned by full SHA, so their side is frozen and a changed number means **Argus** moved, not zod. Two checks divide the work, because only one of them needs the network:

- `pnpm field-scan:check` re-measures and fails on any difference in the compared fields — everything above except `Scan`, which is machine-dependent. **Manual**, since fetching third-party repositories on a trigger nobody schedules runs against the same posture that makes [ADR-0003](docs/adr/0003-supply-chain-hardening-baseline.md) block install scripts.
- `pnpm field-results:check` recomputes every figure in this section from [`docs/field-results.json`](docs/field-results.json) and fails if the prose has drifted from it. No network, no third-party code, so it **runs in CI on every PR** — the snapshot and this text cannot disagree without the build saying so.

Clones go to a temp directory and are deleted after; no third-party source enters this repository. Raw per-rule counts are in the snapshot.

## How the quality was enforced

Every row is one guardrail: what it guarantees, the file that implements it, and a link to a time it demonstrably worked.

| Guarantee                                                                                           | Mechanism                                                                                                                                                           | Receipt                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Argus is held to its own bar.** Every PR scans this whole repo and must come back clean.          | [`argus.yaml`](argus.yaml) · the `dogfood` job in [`ci.yml`](.github/workflows/ci.yml)                                                                              | [#38](https://github.com/WeaversMask/argus-oss/pull/38) — the first whole-repo scan found **38 real violations in production source**. All 38 were fixed, not added to the ignore list.                                                                                                                       |
| **Every PR gets an independent review, and CI fails the PR without one.**                           | the `review-gate` job in [`ci.yml`](.github/workflows/ci.yml) · [execution protocol](docs/plan/protocols/agentic-execution.md)                                      | [#39](https://github.com/WeaversMask/argus-oss/pull/39) — review reproduced a **silent file corruption** in the auto-fix engine: files rewritten wrongly while the tool reported success. A second review then found a bug the first had missed.                                                              |
| **Layering rules are machine-checked**, not left to code review.                                    | [`dependency-cruiser-rules.cjs`](dependency-cruiser-rules.cjs) · the `boundaries` job                                                                               | [#18](https://github.com/WeaversMask/argus-oss/pull/18) — every boundary rule is negative-tested: violated on purpose, confirmed to fail the build, then reverted.                                                                                                                                            |
| **A secret cannot reach the remote.** Scanned at commit, at push, and in CI over full history.      | [`.husky/pre-commit`](.husky/pre-commit) · [`.husky/pre-push`](.husky/pre-push) · the `secret-scan` job · [policy](docs/SECURITY-NOTES.md)                          | [#14](https://github.com/WeaversMask/argus-oss/pull/14) — the pre-push layer **fails closed**: gitleaks exits 0 when its own `git log` fails, so a scan that never ran must not pass.                                                                                                                         |
| **No dependency runs an install script**, and no release younger than 3 days is resolved.           | [`pnpm-workspace.yaml`](pnpm-workspace.yaml) (`allowBuilds`, `minimumReleaseAge`) · [ADR-0003](docs/adr/0003-supply-chain-hardening-baseline.md)                    | [#22](https://github.com/WeaversMask/argus-oss/pull/22) — tree-sitter's native-compile install scripts were reviewed and **denied**; Argus loads the wasm build instead ([ADR-0005](docs/adr/0005-ast-adapter-wasm-tree-sitter.md)).                                                                          |
| **Every third-party license is checked** against an explicit allowlist.                             | [`scripts/check-licenses.mjs`](scripts/check-licenses.mjs) · the `license` job · [ADR-0002](docs/adr/0002-third-party-integration-and-licensing-policy.md)          | [This run](https://github.com/WeaversMask/argus-oss/actions/runs/30641037944) — 563 resolved packages checked, all on the allowlist, 4 named and individually-justified exceptions. Anything else fails the build. Attributions: [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES), regenerated with `pnpm notices`. |
| **The same commit always produces the same bytes.** No model, no nondeterminism, no ordering drift. | [`json.ts`](apps/cli/src/formatters/json.ts) sorts by a total order · the contract is pinned in [`@argus/api-contracts`](packages/api-contracts/src/scan-report.ts) | [#37](https://github.com/WeaversMask/argus-oss/pull/37) — pinned by a golden-bytes test and a second test that shuffles the input and asserts the output bytes do not move ([`json.test.ts`](apps/cli/tests/formatters/json.test.ts)).                                                                        |

Across the workspace, 806 tests cover 98.0% of statements and 93.9% of branches, against [enforced floors](vitest.config.ts) of 85% and 80% — the suite fails below them. Where a defensive branch genuinely cannot be exercised, the exception is written down in that package's README rather than waved through.

**[docs/workflow.md](docs/workflow.md) is the full story** — the loop a task travels from plan file to `main`, what each guardrail above is actually for, and the four things this process does _not_ protect against.

## Quickstart

Argus runs from a clone today; there is no published npm package yet (see [Status](#status)).

```bash
git clone https://github.com/WeaversMask/argus-oss.git && cd argus-oss
pnpm install
pnpm -s argus check .
```

That third command is the one in the recording above. `pnpm -s argus check . --format json` emits the machine-readable document instead; `pnpm -s argus explain <rule-id>` describes any rule. Full command reference: [docs/guide/cli.md](docs/guide/cli.md). Configuration is an optional `argus.yaml` — [docs/guide/configuration.md](docs/guide/configuration.md).

Exit codes follow the usual convention: `0` clean, `1` violations found, `2` something could not be analysed.

### Run it on your own code

`check` takes any path, so the clone above is a tool you point elsewhere — it does not have to be the thing being scanned:

```bash
pnpm -s argus check ~/code/your-project
```

Argus writes nothing to that project on its own, and installs nothing into it — `argus fix` is a separate command you have to ask for, and it only touches import order. This is the same path the [field results](#field-results--argus-on-code-it-didnt-write) above were measured on, so it is exercised against real third-party repositories rather than only this one.

Three things worth knowing before you judge the output. **Start with the first — the other two depend on it:**

- **Put an `argus.yaml` at your project root, even an empty `{}`.** Argus resolves the project root from that file. With it, findings read `src/index.ts`; without it, paths are printed relative to your Argus clone and come out as `../../../code/your-project/src/index.ts`. That file is also where rules get reconfigured or switched off — [configuration reference](docs/guide/configuration.md).
- **Expect the first run on an established codebase to be noisy, and read the split before drawing conclusions.** All ten rules run at their defaults, and defaults encode _a_ house style, not _the_ house style. In the field results above, 87% of the largest project's findings were convention disagreement rather than defects. `node_modules`, `dist/`, `build/` and `coverage/` are skipped for you; generated output living anywhere else — `.next/`, `out/`, `lib/`, `es/` — needs an `ignore:` entry, or it lands in your first run as though you wrote it.
- **Narrow it to a branch's own work** with `--diff`, which is usually the more useful first look. This one **needs the `argus.yaml` from the first bullet** — without a project root to resolve against, it exits `2` rather than guessing:

```bash
pnpm -s argus check ~/code/your-project --diff main
```

Add `--format json` to either for the machine-readable document, and `pnpm -s argus explain <rule-id>` to see what any rule is actually checking.

## Status

**Phase 2 of 12 (they are numbered 0–11) — the MVP is real and runs, on TypeScript and JavaScript.** `argus check` produces genuine findings on real projects, emits JSON for tooling, and gates this repository's own CI. What is _not_ done: `argus` is not installable via `npm i -g` yet (deliberately deferred — packaging is [an open decision](docs/IMPLEMENTATION.md#open-decisions), not an oversight), Python parses but has no rules, and the layer-manifest enforcement that gives the project its name arrives in Phase 3.

Phases 3–11 — layer enforcement, delegated security scanners, persistence, an API, a web UI, reporting, CI integrations, an LSP — are **fully specified and deliberately not yet built**. They are the [continuation track](docs/plan/02-roadmap.md#continuation-track-phases-311--optional-post-m1): planned next steps a maintainer can pick up with zero re-planning, not a backlog of debt. Current state is always in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

If you want the longer story of how this was built, [docs/workflow.md](docs/workflow.md) covers the process, [docs/architecture.md](docs/architecture.md) is the map of the code, and [docs/dev/adding-a-rule.md](docs/dev/adding-a-rule.md) is the shortest path to a working mental model.

---

## Posture

Argus is published as a **public, source-only repository for others to read and reuse**. It is **not sold** and **not operated as a hosted service**. The repository ships source code plus dependency manifests — no vendored third-party binaries, tool source, or rulesets. The governing policy is [ADR-0002](docs/adr/0002-third-party-integration-and-licensing-policy.md).

## External tools / Prerequisites

Argus delegates heavy scanning work to existing engines. The engine binaries below are **not bundled or redistributed with Argus — you install them yourself**, and each runs under its own license:

| Tool                                                        | Role                       | License            | How Argus uses it                                   |
| ----------------------------------------------------------- | -------------------------- | ------------------ | --------------------------------------------------- |
| [TruffleHog](https://github.com/trufflesecurity/trufflehog) | secret detection           | AGPL-3.0           | user-installed binary, arm's-length subprocess only |
| [Semgrep](https://github.com/semgrep/semgrep)               | security patterns          | LGPL-2.1 (engine)¹ | user-installed binary, arm's-length subprocess only |
| [osv-scanner](https://github.com/google/osv-scanner)        | dependency vulnerabilities | Apache-2.0         | user-installed binary, subprocess                   |
| [jscpd](https://github.com/kucherenko/jscpd)                | copy-paste detection       | MIT                | npm dependency (linked library)                     |
| [Prettier](https://github.com/prettier/prettier)            | format checking            | MIT                | npm dependency (linked library)                     |
| [Tree-sitter](https://github.com/tree-sitter/tree-sitter)   | parsing                    | MIT                | npm dependency (linked library)                     |

¹ Semgrep **registry rules** carry a separate license that restricts redistribution. Argus never embeds them: rules are fetched at runtime, supplied by the user, sourced from the permissive Opengrep fork, or first-party ([ADR-0002 §C](docs/adr/0002-third-party-integration-and-licensing-policy.md)).

Copyleft engines are never imported, linked, or vendored — subprocess only, behind the `ToolAdapter` boundary (ADR-0002 §A/§B). Adapters for these tools land in Phase 4; the integration posture is fixed now, ahead of that code (of the six, only Prettier and Tree-sitter are in today's tree). Tool licenses re-verified 2026-07-03.

## Development setup

- **Node** — the version pinned in [`.nvmrc`](.nvmrc) (`nvm use`); the exact floor is enforced via `engines.node` in [package.json](package.json).
- **pnpm** — the exact version pinned in `package.json` → `packageManager`; activate with `corepack enable`. Supply-chain posture (3-day minimum release age for new versions, dependency install scripts blocked by default) per [ADR-0003](docs/adr/0003-supply-chain-hardening-baseline.md).
- `pnpm install` — also installs the git hooks (husky + repo-local gitleaks).
- Everyday commands: `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm gates:check`. Nothing is built yet — the library packages' `exports` point straight at `src/` and the CLI runs from source — so `pnpm typecheck` (`tsc --noEmit`) is what verifies the code compiles, and `pnpm build` is a no-op kept for when the CLI is bundled.

### Docker dev environment (optional)

`docker compose up --build` starts a Node dev container (runs the test suite in watch mode against your bind-mounted checkout) plus Redis and Postgres for later phases — see the comments in [docker-compose.yml](docker-compose.yml). Ports bind to localhost only; commit from the host, not the container. On Linux hosts, files the container writes into the bind mount appear owned by uid 1000. Per [ADR-0002 §D](docs/adr/0002-third-party-integration-and-licensing-policy.md) this is a recipe — no prebuilt image is published.

## License

[MIT](LICENSE). Third-party attributions: [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) (regenerate with `pnpm notices`). Contribution rules, including the licensing guardrails: [CONTRIBUTING.md](CONTRIBUTING.md).
