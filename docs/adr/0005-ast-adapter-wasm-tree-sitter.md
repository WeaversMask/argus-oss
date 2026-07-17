# ADR-0005 — AST adapter runs tree-sitter's wasm build, not the native bindings

**Status:** Accepted
**Date:** 2026-07-17
**Decision makers:** claude-fable-5 (P1-03 session; escalation criteria checked — no cross-package API impact, tree-sitter itself is named by the phase plan)

---

## Context

P1-03 introduces `@argus/ast`, the first real port implementation: a tree-sitter wrapper conforming to core's `AstParserPort`. Tree-sitter ships to Node two ways:

1. **Native bindings** (`tree-sitter` npm package + per-grammar `node-gyp-build` install scripts) — fastest, but every install compiles C via node-gyp unless a prebuilt binary matches the platform.
2. **wasm** (`web-tree-sitter` + per-grammar prebuilt `.wasm` artifacts shipped in the same grammar tarballs) — no install scripts at all, identical bytes on every platform.

Two repo constraints bear directly on the choice:

- **ADR-0003 §3: dependency build scripts are blocked** (`allowBuilds` in `pnpm-workspace.yaml`). The native route would require allowlisting `node-gyp-build` install scripts for the parser and every grammar — exactly the payload-execution channel ADR-0003 closed. pnpm 11 fails install (`ERR_PNPM_IGNORED_BUILDS`) on unreviewed build scripts.
- **The dev container is `node:22-bookworm-slim`** (P0-06): no python3/make/g++, so any native fallback compile fails in Docker; and Docker-on-Apple-silicon means linux-arm64 prebuilds would be load-bearing.

The P1-03 acceptance criterion is an executable benchmark: parse a 1000-line TypeScript file in <100ms on M2.

## Decision

1. **`@argus/ast` uses `web-tree-sitter` (0.26.11, exact-pinned) and loads each language from the prebuilt `.wasm` shipped inside the official grammar packages** (`tree-sitter-typescript` 0.23.2, `tree-sitter-javascript` 0.25.0, `tree-sitter-python` 0.25.0 — all MIT, tree-sitter-org maintainers, tarball contents verified at vetting).
2. **The grammar packages' native binding halves are dead weight, never loaded**: their `install: node-gyp-build` scripts are pinned to **reviewed-and-denied** (`allowBuilds: <pkg>: false`), which keeps the scripts blocked while letting `pnpm install` exit 0. The native `tree-sitter` peer dependency is optional and is not installed.
3. **Grammar wasm files are read explicitly** (`readFile` + `Language.load(bytes)`) from paths resolved out of the installed packages (`grammarWasmPath`), overridable per language (`TreeSitterAstParserOptions.grammarPaths`) for bundlers and failure-path tests.

## Consequences

### Positive

- Zero dependency install scripts, in line with ADR-0003; supply-chain review surface stays "files consumed", not "code executed at install".
- Identical behaviour across macOS/M2, CI x64 Linux, and the slim Docker image — no toolchain, no platform prebuild matrix, no EACCES/node-gyp classes of failure.
- Comfortably inside the performance budget: measured **median 13.2ms** for the 1000-line acceptance file on M2 (min 11.3 / max 19.6 over 15 runs), ~7.5× headroom, conversion to frozen domain nodes included.
- Engine and grammars are version-pinned bytes in the lockfile; grammar drift is caught by the per-language smoke tests.

### Negative / accepted

- wasm parsing is roughly 2–3× slower than native tree-sitter. Accepted: absolute numbers are milliseconds per file; the benchmark is committed and will surface any future squeeze. If a Phase-2+ workload hits a real wall, revisiting means allowlisting grammar builds under review (ADR-0003 §3 procedure), not a design change — the port boundary hides the swap.
- The wasm engine's memory is not garbage-collected: `AstDocument` holds the live tree for queries and must be `dispose()`d. The port-level `parse()` frees it internally, so only query users carry the obligation (documented on the class).
- `web-tree-sitter`'s language ABI window (currently 13–15) must cover every pinned grammar (currently ABI 14–15). A grammar or engine bump that breaks compatibility fails loudly at `Language.load` — and the smoke tests catch it on update day.

## Revisit when

- A measured parsing bottleneck survives caching/incremental strategies (benchmark history is the evidence), or
- core's `Language` union grows a language whose grammar package ships no wasm artifact (then: build the wasm in a controlled step, or reopen the native question for that grammar alone).
