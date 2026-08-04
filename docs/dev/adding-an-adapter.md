# Adding an adapter

> How to add a member of the `packages/adapters/*` family. Written from P2-06 (`@argus/adapters-prettier`, the first one) — the package shape, the repo wiring, and the contract-test pattern. Phase 4 is an entire phase of these.

An adapter is **one implementation of one core port**, and nothing else. It translates between the outside world and the domain: it owns the call into the external thing, converts that thing's vocabulary into core's, and returns a `Result` instead of throwing. It does not decide _when_ it runs or _what_ it runs on — an app wires it at the edge.

Everything below follows from that. The one thing that will actually trip you up is in step 3.

## 1. Pick the port

The port already exists in [`packages/core/src/ports/`](../../packages/core/src/ports/) and its TSDoc **is** the specification — read it before writing any code, because that comment is what the contract test in step 4 asserts against.

`@argus/adapters-prettier` implements [`FormatterPort`](../../packages/core/src/ports/formatter.ts). Phase 4's adapters implement [`ToolAdapterPort`](../../packages/core/src/ports/tool-adapter.ts), which is a wider contract: it returns `Finding[]` (raw tool output — triage into `Violation`s happens downstream, not here), it must map the tool's native coordinates onto ADR-0004's 1-based end-exclusive positions, and crashes, timeouts and unparseable output all have to become a `ToolExecutionError` rather than an exception.

If the port you need does not exist yet, you are adding a port, not an adapter — that is a core change, and it needs an ADR.

## 2. Create the package

```
packages/adapters/<tool>/
├── package.json          name: @argus/adapters-<tool>, private, "exports" with a single "." entry
├── tsconfig.json         extends "../../../tsconfig.base.json"  ← three levels, not two
├── vitest.config.ts      defineProjectConfig({ test: { name: "@argus/adapters-<tool>" } })
├── README.md             purpose · public surface · how it fits · maintenance notes
├── src/
│   ├── index.ts          the public entry — re-export only what callers may touch
│   └── <tool>-<role>.ts  the implementation
└── tests/
    ├── contract.test.ts  conformance with the port (step 4)
    └── <tool>-<role>.test.ts
```

Dependencies: `@argus/core` (the contract), `neverthrow`, and the external tool, exact-pinned. **Not `@argus/rule-engine`, not another adapter, never an app.**

**Before you add the tool itself, check its licence.** Bringing it in as a linked library is only available to permissive licences — [ADR-0002](../adr/0002-third-party-integration-and-licensing-policy.md) requires copyleft engines (Semgrep, TruffleHog) to stay arm's-length subprocesses, and forbids vendoring their rule packs. Prettier is MIT, which is why P2-06 could call its JS API directly. Run `pnpm license-check` and regenerate `pnpm notices` once the dependency tree moves.

## 3. Wire it into the repo — the nesting is the trap

`packages/adapters/<tool>/` sits **one path segment deeper** than every other workspace package, and that difference has already defeated two separate mechanisms that were written, reviewed and believed correct:

- **The `no-cross-package-deep-imports` backstop cannot see you.** Its `from: { path: "^packages/([^/]+)/" }` captures `adapters` for _every_ nested adapter, so one adapter deep-importing a **sibling** adapter is invisible to it (recorded as a known limitation in [`dependency-cruiser-rules.cjs`](../../dependency-cruiser-rules.cjs)). The per-package rule below is the only thing that catches it — which is exactly why yours must not skip it.
- **The `docs-delta` CI gate silently exempted the whole family.** Its source pattern was `^(packages|apps)/[^/]+/src/`, which matches one segment before `src/`, so every change under `packages/adapters/*/src/**` took the "no source touched" branch and passed. Caught in review, not by the author's 34 test cases — all of which used flat layouts.

**So: when you write a path pattern anywhere in this repo, test it against `packages/adapters/prettier/` before you believe it.**

The checklist, all of it required:

| Where                                                                | What to add                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`dependency-cruiser-rules.cjs`](../../dependency-cruiser-rules.cjs) | An `adapters-<tool>-public-entry-only` rule, mirroring your `exports` map exactly. **Non-optional — see above.**            |
| [`vitest.config.ts`](../../vitest.config.ts) (root)                  | `"packages/adapters/<tool>/vitest.config.ts"` in `projects` — otherwise your tests never run at the root, which is sign-off |
| [`Dockerfile.dev`](../../Dockerfile.dev)                             | `/app/packages/adapters/<tool>/node_modules` in the `mkdir -p` block                                                        |
| [`docker-compose.yml`](../../docker-compose.yml)                     | **Two** edits: the volume mount under the service, and the named volume declaration                                         |

[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) already globs `packages/adapters/*`, and [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs)'s exclusions already use `^packages/adapters/[^/]+/`, so neither needs an edit — one segment is the right depth in both.

## 4. Test it

Two suites, and the split matters:

- **`tests/contract.test.ts` asserts the port's documented contract**, in the port's own vocabulary — assignable to the interface, never throws (bad input returns `err(...)` with the right error type), and every invariant the TSDoc claims. `PrettierFormatter`'s covers idempotence and purity because `FormatterPort` promises both. This suite is what makes the adapter a **drop-in replacement candidate**: it should pass unchanged against a different implementation of the same port.
- **`tests/<tool>-<role>.test.ts` covers this implementation's own decisions** — the ones a replacement would not share.

Drive the external tool for real against a temp directory (`mkdtempSync` + an `afterEach` cleanup, as in [`contract.test.ts`](../../packages/adapters/prettier/tests/contract.test.ts)); do not mock the thing you are adapting, or the test only proves your mock matches your code. Build domain values through core's factories, never as hand-shaped literals. Import through `../src/index.js`.

## 5. Sanity checklist

- Root gates green: `pnpm lint && pnpm typecheck && pnpm test && pnpm gates:check`, plus `pnpm boundaries`. A new adapter is a new package, so `gates:check` is what catches it being wired in half-way — no `typecheck` script, or missing from `projects` in the root `vitest.config.ts`.
- Coverage ≥85% line / ≥80% branch. Adapters are small, so a single uncovered arm can sink the branch score — if a path is genuinely unreachable through the public surface, export the helper and unit-test it directly, and say why in the README.
- Package `README.md` written; [`../architecture.md`](../architecture.md)'s package table gains a row.
- `pnpm license-check` and `pnpm notices` if the dependency tree moved.
- The dogfooding scan (`pnpm argus check .`) still clean.

> **Phase 4 will need a second page.** `adding-a-tool-adapter.md` covers what is specific to `ToolAdapterPort` and does not exist yet: `packages/adapters/_shared/` (subprocess timeouts, stream parsing, error mapping — P4-01), severity translation into `Finding`, secret redaction, and the copyleft subprocess boundary. Write it with the first one, and link it here. Everything on this page applies to those adapters too.
