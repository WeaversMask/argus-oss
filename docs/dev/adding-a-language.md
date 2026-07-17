# Adding a language

> How to teach Argus a new source language. Written with P1-03 (`@argus/ast`, the first three languages) — the pattern repeats for every language after.

A "language" is two coordinated changes: core's `Language` union grows a member, and `@argus/ast` wires a tree-sitter grammar for it. Everything else (rules, layers, reports) keys off those.

## 1. Vet the grammar package (ADR-0003 dance)

Official grammars live at `tree-sitter-<lang>` on npm, maintained by the tree-sitter org. Before adding one:

- `npm view tree-sitter-<lang> version license time maintainers` — MIT (or otherwise allowlisted per ADR-0002 §G), published ≥3 days ago (pnpm enforces `minimumReleaseAge` anyway), canonical maintainers (`amaanq`, `maxbrunsfeld`, `ahlinc`, …).
- **Confirm the tarball ships a prebuilt `tree-sitter-<lang>.wasm`** — stream it and look: `curl -sL "$(npm view tree-sitter-<lang> dist.tarball)" | tar -tzf - | grep wasm`. We consume **only** the wasm; the native binding half of the package is never loaded (ADR-0005). No wasm in the tarball ⇒ stop and reopen ADR-0005's "revisit when" section.
- Check the engine/grammar **ABI window**: `web-tree-sitter` supports a range of language ABI versions (13–15 at 0.26). An incompatible grammar fails loudly at `Language.load`; the smoke test you'll write below catches it, but check `npm view` release notes first to avoid a dead-end install.

## 2. Wire it up

1. **`packages/core/src/ports/ast-parser.ts`** — add the member to `LANGUAGES`. This is a core public-API change: it belongs in its own reviewed change unless the language task owns it.
2. **`packages/ast/package.json`** — add `tree-sitter-<lang>` exact-pinned to `dependencies`; `pnpm install`.
3. **`pnpm-workspace.yaml`** — pnpm will fail install over the grammar's `node-gyp-build` install script; add `tree-sitter-<lang>: false` under `allowBuilds` (reviewed-and-**denied**: we use the wasm only). pnpm scaffolds a placeholder entry for you when it errors — replace it with an explicit `false`.
4. **`packages/ast/src/languages.ts`** — add the `GRAMMARS` entry (`pkg` + `wasmFile`).
5. **`pnpm notices`** — regenerate `THIRD-PARTY-NOTICES`; `pnpm license-check` must stay green.

## 3. Test it (all three are mandatory)

- **Smoke test** (`packages/ast/tests/smoke.test.ts`): add a `describe.each` row — an idiomatic ~15-line fixture, the expected root node type (`program`, `module`, …), and 3-ish signature constructs. This is the grammar-drift canary for every future dependency bump.
- **Conversion oracle**: add the fixture to the "positions core's `position()` factory accepts" loop in `conversion.test.ts` — every node of the parsed tree must produce a factory-valid position.
- **A known-coordinate spot check** if the language's grammar does anything exotic with points (heredocs, significant whitespace): assert one hand-computed `+1` conversion like the existing TS cases.

## 4. Sanity checklist

- `pnpm boundaries`, root `pnpm lint && pnpm typecheck && pnpm build && pnpm test` — all green.
- Grammar ships **no runtime code we execute** — if a future grammar needs its install script (it shouldn't), that's an ADR-0003 §3 review, not a quiet `true`.
- Update `packages/ast/README.md` (supported languages) and this recipe if the pattern shifted.
