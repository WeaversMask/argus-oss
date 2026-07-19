# `@argus/config`

> The configuration system: zod-validated `reviewtool.yaml`, cosmiconfig discovery, ESLint-style `extends:` inheritance, hierarchical merging — and validation errors that point at the exact YAML line.

## Purpose

`config` owns everything between a `reviewtool.yaml` on disk and a typed, frozen `ResolvedConfig` in memory: discovery (cosmiconfig, nearest-file-wins), parsing (the `yaml` package, positions kept), schema validation (zod, strict — unknown keys are errors; rule ids validated through core's `ruleId` factory), `extends:` resolution (relative paths, depth-first, cycle-detected), and level merging (org → team → repo → path, nearest wins). It does **not** decide what the config _means_ at scan time — matching `ignore` globs, activating rules, choosing files is Phase-2 orchestration.

This package touches the filesystem by design (it is the config-loading edge of the hexagon); the parse/validate/merge core is pure and exposed for in-memory use.

## Public surface

| Export                           | Kind     | Summary                                                                                                                                                                                                                            |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ConfigLoader`                   | class    | `load(file)` (explicit file + extends chain) · `search(fromDir)` (nearest config walking up; absence = `ok(undefined)`) · `loadHierarchy(fromDir, stopDir)` (merge every level, nearest wins). All return `Result<…, ConfigError>` |
| `validateConfigText(file, text)` | function | Parse + validate without the filesystem — the seam for editors and the future LSP                                                                                                                                                  |
| `ConfigError` (`ConfigIssue`)    | error    | `DomainError` (`code: "config/invalid"`); every issue carries file, 1-based line/column, and dot-path                                                                                                                              |
| `ResolvedConfig`                 | type     | Frozen final shape: `languages` (default: all), `ignore` (default: none), `rules` as core `RuleActivation`s sorted by rule id (`"off"` entries preserved)                                                                          |
| `RawConfig`, `RuleSetting`       | types    | The validated per-file document shape (pre-merge)                                                                                                                                                                                  |
| `CONFIG_FILE_NAMES`              | const    | `reviewtool.yaml`, `reviewtool.yml` — the discovery search places                                                                                                                                                                  |

## How it fits

- **Depends on:** `@argus/core` (severity/language/rule-id vocabulary + `RuleActivation`), `neverthrow`, and three vetted externals — `zod` 4.4.3 (MIT), `cosmiconfig` 9.0.2 (MIT), `yaml` 2.9.0 (ISC) — all exact-pinned, script-free, and already present in `THIRD-PARTY-NOTICES`.
- **Consumed by:** Phase-2 scan orchestration and the CLI; later the LSP (via `validateConfigText`).
- **Boundary rules:** imports land on public entries only (`config-public-entry-only` in [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs)).

## Usage

```ts
import { ConfigLoader } from "@argus/config";

const loader = new ConfigLoader();
const result = await loader.search(process.cwd());
result.match(
  (config) => {
    if (config === undefined) return; // no file anywhere up the tree — all defaults
    config.rules.forEach((activation) => {
      /* … */
    });
  },
  (error) => {
    // error.message: "Invalid configuration in …: file:4:5 languages.1 — …"
    error.issues.forEach(({ file, line, column, path, message }) => {
      /* … */
    });
  },
);
```

User-facing format reference: [`docs/guide/configuration.md`](../../docs/guide/configuration.md).

## Design decisions

- **cosmiconfig discovers, `yaml` parses.** The cosmiconfig loaders hand raw text through so parsing stays ours — the `yaml` `Document` (+ `LineCounter`) survives to map zod issue paths onto exact line/column. cosmiconfig runs with `searchStrategy: "global"` (v9 defaults to no upward search) and `cache: false` (a scan is short-lived; stale config is worse than a few reads).
- **Strict schema.** Unknown keys are per-key, line-accurate errors (strict-object issues are expanded so each stray key gets its own pointer). Rule ids go through core's `ruleId` — config and domain share one vocabulary.
- **Merge semantics:** `rules` per-rule-id wholesale replace; `languages`/`ignore` replace, never concatenate; `extends` never survives resolution. One place implements it (`src/merge.ts`), the guide documents it.
- **Absence is not an error:** `search`/`loadHierarchy` return `ok(undefined)` when no file exists (port convention from P1-02).
- **YAML 1.2 core schema** — unquoted `off` is the string `"off"`, not `false`; pinned by test against option drift.
- **Deferred:** `suppressions:` (identity/`createdAt` design, Phase 2) and `layers:` (P3-01). The schema is strict, so both will be _added_, not retrofitted around loose keys.

## Maintenance notes

- **Uncovered defensive branches (two, unreachable by construction):** `resolved.ts` re-validating rule ids the schema already validated (guards schema/factory drift) and `search()`'s catch around cosmiconfig (filesystem faults surface as values, not rejections).
- **zod major bumps:** issue mapping relies on v4 issue shapes (`code`, `path`, `keys` on `unrecognized_keys`, union aggregation) — re-run the validate suite and eyeball message quality on any bump.
- Private workspace package; not published.
