<!--
  Package README template. Copy to packages/<pkg>/README.md (or apps/<app>/README.md)
  when the package is created; keep it current when its public surface changes.
  See docs/plan/03-documentation.md for when/why. Keep it tight — a page, not a manual.
  Replace every italicised prompt below, then delete this comment.
-->

# `@argus/PACKAGE-NAME`

> _One sentence: what this package is and the single reason it exists._

## Purpose

_2–4 sentences. What problem this package owns, and — just as important — what it deliberately does NOT do. If it has an architectural constraint (e.g. "zero infrastructure dependencies", "interface-only"), state it here._

## Public surface

_What consumers import from this package. Keep in sync with_ `src/index.ts`.

| Export         | Kind                    | Summary                                             |
| -------------- | ----------------------- | --------------------------------------------------- |
| `exportedName` | function / type / class | _one line — full detail lives in its TSDoc comment_ |

_If the package exposes subpath exports (e.g._ `@argus/PACKAGE-NAME/config`_), list them and what each is for._

## How it fits

- **Depends on:** _internal packages + notable external deps, or "nothing (leaf)"_
- **Consumed by:** _who imports this, or "tests only"_
- **Boundary rules:** _any forbidden-import / layering constraint from 01-repo-structure.md that applies here_

## Usage

```ts
// The smallest real example of using this package's main entry point.
```

## Maintenance notes

_Anything a future maintainer needs that isn't obvious from the code: invariants, gotchas, why a surprising choice was made (link the ADR), test-coverage exceptions, publish status (e.g. private workspace package). Keep to what would actually bite someone._
