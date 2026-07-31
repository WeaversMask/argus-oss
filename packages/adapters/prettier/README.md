# `@argus/adapters-prettier`

> The Prettier adapter behind core's `FormatterPort`. Formats source text using the target project's own Prettier config — the finishing pass `argus fix` (P2-06) runs over any file it edited.

## Purpose

`adapters-prettier` owns the one call into Prettier's JS API: given source text and a file, format it the way that project's own `prettier --write` would. It resolves config **relative to the project root it was constructed with**, never `process.cwd()` — `argus` can run from a subdirectory of the project it scans, and resolving against the wrong directory would silently pick up the wrong `.prettierrc` (or none). It does not decide _which_ files get formatted or _when_ — that's `apps/cli`'s job; this package only answers "format this text."

Prettier is used programmatically here (not as an arm's-length subprocess): it is MIT-licensed and already a root devDependency for this repo's own formatting, so ADR-0002's copyleft-isolation concern does not apply — the port exists so this package's own contract test can validate the real adapter in isolation, and so a fake `FormatterPort` remains available to any future caller that wants one, matching every other external-tool integration in this repo. `apps/cli`'s `fix` command constructs the real `PrettierFormatter` directly, the same way it constructs the real AST parser and engine — no injection today.

## Public surface

| Export              | Kind  | Summary                                                                                   |
| ------------------- | ----- | ----------------------------------------------------------------------------------------- |
| `PrettierFormatter` | class | Implements `FormatterPort.format`. Constructed with the project root config resolves from |

## How it fits

- **Depends on:** `@argus/core` (the contract it implements), `neverthrow`, `prettier` (external, MIT, exact-pinned — matches the version this repo's own `format`/`format:check` scripts use).
- **Consumed by:** `apps/cli`'s `fix` command, as the finishing pass after magic-string edits.
- **Boundary rules:** imports land on `@argus/core`'s public entry only; other packages import this package's public entry only (`adapters-prettier-public-entry-only` in [`.dependency-cruiser.cjs`](../../../.dependency-cruiser.cjs)). `packages/rule-engine` may not import any `packages/adapters/*` (`rule-engine-never-imports-adapters`) — adapters are wired at the app edge, not inside the engine.

## Usage

```ts
import { filePath } from "@argus/core";
import { PrettierFormatter } from "@argus/adapters-prettier";

const formatter = new PrettierFormatter("/path/to/project/root");
const result = await formatter.format("const x=1", filePath("src/example.ts")._unsafeUnwrap());
result.map((formatted) => console.log(formatted)); // 'const x = 1;\n'
```

## Maintenance notes

- **Idempotent by construction:** formatting already-formatted text is a no-op — Prettier's own contract, verified here rather than assumed.
- **No config in the target project falls back to Prettier's own defaults**, not this repo's `.prettierrc.json` — this adapter never imposes Argus's own style opinions on a project it scans.
- **`message()` is exported and directly unit-tested** (not exercised through `format()` itself): Prettier only ever rejects with `Error` instances in practice, so the non-`Error` arm is otherwise unreachable — and this package has too few total branches for one uncovered arm to stay under the 80% branch threshold. Not part of the package's public surface (not re-exported from `index.ts`); tested via a relative import, same as any rule module's own test.
- Private workspace package; not published.
