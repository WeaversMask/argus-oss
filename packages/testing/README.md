# `@argus/testing`

> Shared test infrastructure for the monorepo — Vitest config, custom matchers, fixtures, and in-memory fakes for `@argus/core`'s ports. Consumed only by other packages' tests, never by shipped code.

## Purpose

`testing` keeps test setup consistent and DRY across the workspace: one place defines the Vitest defaults (Node environment, coverage thresholds, matcher registration), the custom matchers, and the safe fixtures every package's tests reuse. It exists so packages don't each hand-roll — and drift on — their own test config.

## Public surface

Three entry points (see [`package.json`](./package.json) `exports`):

| Import                                                      | Kind                  | Summary                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@argus/testing/config` → `defineProjectConfig(overrides?)` | Vitest config factory | Deep-merges shared defaults (Node env, include globs, `clearMocks`/`restoreMocks`, coverage provider + thresholds **85% lines / 80% branches / 85% functions & statements**) with per-package overrides. Called from each package's `vitest.config.ts`.                                                                                                                                                  |
| `@argus/testing/setup`                                      | Vitest setup file     | Registers the custom matchers via `expect.extend`. Wired in automatically by `defineProjectConfig` (`setupFiles`).                                                                                                                                                                                                                                                                                       |
| `@argus/testing` → `toBeNonEmpty`                           | custom matcher        | Asserts a collection/string is non-empty. Importing the package root also loads the matcher **type augmentation**, so `expect(x).toBeNonEmpty()` is typed.                                                                                                                                                                                                                                               |
| `@argus/testing` → in-memory fakes                          | test doubles          | Fakes implementing `@argus/core`'s ports: `InMemoryProjectRepository` / `InMemoryScanRepository` / `InMemoryViolationRepository` / `InMemorySuppressionRepository`, `FakeAstParser`, `FakeDependencyResolver`, `FakeRuleRunner`, `FakeToolAdapter`, `RecordingNotificationPort`, `RecordingProgressReporter` (+ `ProgressCall`). Failure injection via caller-supplied error instances (`failNextWith`). |
| `@argus/testing` → `fakeSecret`, `FakeSecretKind`           | fixture               | Produces a deterministic, obviously-fake secret-shaped string (AWS / GitHub / generic). Allow-listed in [`.gitleaks.toml`](../../.gitleaks.toml) so fixtures never trip the secret scanner.                                                                                                                                                                                                              |

## How it fits

- **Depends on:** `vitest` + `neverthrow` (runtime — the fakes return `Result`), and `@argus/core` as a **peer** dependency, imported **type-only** (no runtime coupling).
- **Consumed by:** other packages' **tests** only — never imported by shipped/runtime code.
- **Boundary note:** the fakes need `@argus/core`'s port _types_ while `core` dev-depends on `testing` — a potential workspace cycle. Defused (P1-02): `@argus/core` is a **peer** dep (peer edges sit outside turbo's task graph, which refuses even dev-only cycles) consumed via **type-only** imports, and failures are injected through caller-supplied error instances rather than importing error classes.

## Usage

```ts
// a package's vitest.config.ts
import { defineProjectConfig } from "@argus/testing/config";

export default defineProjectConfig({
  // per-package overrides here; defaults (coverage thresholds, setup) come for free
});
```

```ts
// in a test
import { fakeSecret } from "@argus/testing";

const token = fakeSecret("github-token"); // safe, scanner-allow-listed fixture
expect(findings).toBeNonEmpty(); // custom matcher, typed
```

```ts
// swap a real port for an in-memory fake in a test
import { InMemoryScanRepository } from "@argus/testing";

const scans = new InMemoryScanRepository(); // implements @argus/core's ScanRepositoryPort
```

## Maintenance notes

- **Coverage thresholds live here**, in `defineProjectConfig` — changing them changes the bar for every package. Do it deliberately and note it in the PR.
- **Fixtures must stay scanner-safe** — any new `fakeSecret` kind or secret-shaped fixture must be allow-listed in [`.gitleaks.toml`](../../.gitleaks.toml), or pre-commit/pre-push will (correctly) block it.
- **Publish status:** internal workspace package (`private`, `UNLICENSED`, `0.0.0`) — not published. Reuse governed by the repo-root MIT [`LICENSE`](../../LICENSE).
