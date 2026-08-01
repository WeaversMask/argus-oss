# ADR-0002 — Third-Party Integration & Open-Source Licensing Policy

**Status:** Accepted
**Date:** 2026-06-01
**Decision makers:** Maintainer (confirmed at the P0-10 planning checkpoint)

---

## Context

Argus is a deterministic (no-AI) static-analysis and architecture-enforcement platform. By design it **delegates** heavy algorithmic work to existing open-source engines — Tree-sitter, Semgrep, jscpd, TruffleHog, osv-scanner, Prettier — and builds the orchestration, rule engine, layer enforcement, UI, LSP, and reporting on top of them (see [`02-roadmap.md`](../plan/02-roadmap.md) and [`phase-04-tool-adapters.md`](../plan/phases/phase-04-tool-adapters.md)).

The maintainer has decided to publish Argus as a **public, source-only Git repository for others to read and reuse**. Argus will **not** be sold and will **not** be operated as a hosted service. That decision has licensing consequences that must be settled **before** any tool-integration code is written (Phase 4), because retrofitting an integration boundary after the fact is expensive and error-prone.

Two of the delegated engines are copyleft:

- **TruffleHog — AGPL-3.0** (strong, network-aware copyleft)
- **Semgrep engine — LGPL-2.1**; the Semgrep **registry rules** carry a separate license restricting **redistribution**

The rest of the delegated tools and the dependency tree are permissive.

> **This is an engineering posture, not legal advice.** It records how the codebase is structured to stay consistent with the maintainer's "publish source, don't sell, don't host" intent. Items needing human/legal judgement are marked `TODO(licensing:)`.

### Audit of the current tree (2026-06-01)

The current tree was treated as unverified and re-checked:

- **Dependency licenses** (`pnpm licenses list`, all deps): **no GPL / AGPL / LGPL / SSPL / Commons-Clause / Semgrep-Rules present.** 223 of ~231 resolved packages are MIT / ISC / Apache-2.0 / BSD-2-Clause / BSD-3-Clause. Outliers: **MPL-2.0 ×2** (`lightningcss`, `lightningcss-darwin-arm64` — weak/file-level copyleft, dev-only transitive), **BlueOak-1.0.0 ×5** (`minimatch`, `minipass`, `path-scurry`, `jackspeak`, `package-json-from-dist`), **Python-2.0 ×1** (`argparse`).
- **No copyleft tool internals are imported / linked / FFI'd** — no adapter code exists yet. All Semgrep/TruffleHog/osv references are in docs.
- **No committed Semgrep rules / `p/` packs, no vendored binaries, no `vendor/` tree, no git submodules.**
- **No `LICENSE` file existed**; `package.json` declared `"license": "UNLICENSED"`.
- **No Docker build-and-publish step exists yet** (the Dockerfile is the next task, P0-06).

The posture below is therefore **preventive**: it is being installed before the first risky integration lands.

## Options Considered

### 1. Project license — **MIT (chosen)** vs Apache-2.0

- **MIT (chosen):** shortest, maximally permissive, maximal reuse. No explicit patent grant.
- **Apache-2.0:** adds an explicit patent grant, patent-retaliation clause, and a NOTICE mechanism; more ceremony.

Chosen: **MIT**, matching the maintainer's "let others freely reuse" intent. Revisit and migrate to Apache-2.0 if a defensive patent posture becomes desirable.

### 2. Integration boundary for copyleft engines — **subprocess-only (chosen)** vs linking

- **Subprocess-only (chosen):** copyleft engines are spawned as arm's-length separate processes, communicating via CLI args and parsed stdout / exit codes / JSON. Never imported, linked, statically bundled, vendored, or added as submodules.
- **Linking / library import:** rejected — it would entangle Argus's own (MIT) source with AGPL/LGPL obligations.

### 3. Semgrep rules — **referenced/fetched (chosen)** vs embedded

- **Referenced/fetched (chosen):** rules are fetched at runtime on the user's machine, or the user supplies their own config; optionally support the permissive **Opengrep** fork and/or **first-party** in-repo rules (Argus's own security patterns).
- **Embed registry rule packs in the repo:** rejected — the Semgrep Rules License restricts redistribution.

### 4. Docker — **recipe (chosen)** vs published prebuilt image

- **Recipe (chosen):** a `Dockerfile` that _installs_ the external tools is a build recipe; fine to publish.
- **Published prebuilt image with tools baked in:** rejected for now — it would redistribute the copyleft binaries. Needs its own license review if wanted later.

## Decision

Argus adopts the following **non-negotiable, repo-wide policy**. Every later phase inherits it.

### A. Copyleft engines are subprocess-only

TruffleHog (AGPL-3.0) and the Semgrep engine (LGPL-2.1) are invoked **only as arm's-length subprocesses** (e.g. via `child_process`), behind the `ToolAdapter` boundary. They are **never** imported, linked, statically bundled, vendored as source, or added as submodules. For architectural consistency, **all** external tool CLIs (including osv-scanner) are reached only through that adapter boundary. Permissively-licensed libraries that are _linked into the process_ (jscpd, Prettier — both MIT) may be imported, but must still pass the license allowlist (§G).

### B. No vendoring of third-party artifacts

No third-party tool binaries, vendored tool source, or copies of their rule sets are committed. External tools are **prerequisites the user installs themselves**. The repo ships **source plus dependency manifests, nothing more**.

### C. Semgrep rules are referenced, never embedded

No Semgrep rule files, rule packs, or vendored `p/...` rulesets are committed. Rule source is **configurable**: fetched at runtime / bring-your-own config, and/or the Opengrep fork, and/or first-party in-repo rules.

### D. Docker is a recipe, not a redistribution

Publishing a `Dockerfile` that _installs_ the external tools is allowed. **No CI/release step builds and publishes a prebuilt image with those tools baked in.** A published image, if wanted later, requires its own license review — `TODO(licensing:)`.

### E. Project license — MIT

The repo is licensed **MIT** (`LICENSE` at root; `package.json` `"license": "MIT"`). The two must always agree.

### F. Notices and prerequisites

- A `THIRD-PARTY-NOTICES` file is generated from the dependency tree and kept current (preserving notices is required for Apache-2.0 components and is good practice for all). **License notices are never dropped — even for permissive licenses.**
  - _Enforcement note (OPS-06, 2026-08-01):_ "kept current" was an unenforced convention until the `license` job gained `pnpm notices:check`. It compares the part of the file that is a pure function of the tree; packages declaring `os`/`cpu`/`libc` resolve differently on every host, so they are inventoried in a trailing section the check cannot compare. Dropping them would have made the whole file comparable — and was rejected precisely because of the sentence above: `fsevents` carries a copyright line held by no other package in the tree.
- The README carries an **"External tools / Prerequisites"** section: each external tool, that the user installs it separately, and its license.

### G. License-compliance self-audit guardrail

An SPDX allowlist gates the dependency tree, wired as both a CI gate and a local script (powered by `license-checker`).

- **Allow:** `MIT`, `ISC`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `0BSD`, `Unlicense`, `CC0-1.0`, **`BlueOak-1.0.0`**, **`Python-2.0`**.
- **Deny / flag:** `AGPL`, `GPL`, `LGPL` (as a linked dependency), `SSPL`, `Commons-Clause`, the **Semgrep-Rules-License**.
- **`MPL-2.0`:** not blanket-allowed. The current dev-only transitive uses (`lightningcss*`) are recorded as a **named, reviewed exception with their notices preserved** (§F); any _new_ MPL-2.0 dependency must trip the gate for review. `TODO(licensing:)` — re-confirm if `lightningcss` ever becomes a production dependency.

## Consequences

### Positive

- The MIT/AGPL/LGPL boundary is settled before Phase 4 writes a line of adapter code; "swap a tool = swap one adapter" is preserved by routing every tool through `ToolAdapter`.
- Copyleft creep into transitive deps is caught automatically (§G).
- A source-only repo with user-installed prerequisites carries the lightest redistribution burden.

### Negative

- Users must install the external tools themselves (documented in the README prerequisites).
- The Semgrep adapter cannot ship a convenient embedded rule pack; rules must be fetched / BYO / first-party / Opengrep.
- A one-command "everything baked in" Docker image is off the table until a dedicated license review.

### Impact on existing plan docs (to be reconciled in P0-11)

- [`phase-04-tool-adapters.md`](../plan/phases/phase-04-tool-adapters.md) **[P4-03]** currently says Semgrep "**Bundles default rule pack (OWASP Top 10)**" — **contradicts §C**; reword to runtime-fetch / BYO / Opengrep / first-party.
- Phase-04 notes ("Pin in `package.json` for npm wrappers") must clarify that copyleft engines are reached as subprocesses, not linked libraries (§A).
- [`phase-11-hardening.md`](../plan/phases/phase-11-hardening.md) exit criteria and Phase 9 list publishing to "Docker Hub, GHCR" — flag with `TODO(licensing:)` per §D.
- [`risks.md`](../risks.md) R-006 mitigation now points here; new risk R-011 (copyleft engine linked instead of subprocessed) added.

## Related ADRs

- [ADR-0001 — Monorepo with pnpm Workspaces and Turborepo](./0001-monorepo-with-pnpm.md)

## References

- `LICENSE` (MIT) at repo root — `TODO(licensing:)` confirm the copyright holder string ("The Argus Authors" is a placeholder the maintainer may replace with a preferred legal name).
- Tool licenses cited here are the engines' headline licenses; **re-verify the exact license of each pinned tool version when adapters land (Phase 4)** — licenses change between versions. `TODO(licensing:)`.
- The design "spec doc" referenced elsewhere (e.g. phase-11 "§4.6") is **not committed**; the in-repo design surface is the phase docs, [`01-repo-structure.md`](../plan/01-repo-structure.md), and [`00-principles.md`](../plan/00-principles.md). `TODO(licensing:)` — fold posture into a canonical spec if one is later added.
