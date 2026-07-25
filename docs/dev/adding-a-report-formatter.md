# Adding a report formatter

> How to give `argus check` another way to say what it found. Written with P2-04 (`--format json`, the first time the CLI had a format to choose) — the pattern repeats for SARIF, JUnit, HTML, and whatever Phase 8 adds.

A formatter is a **pure function from `ScanReport` to a string**. It renders; it never scans, never decides exit codes, and never touches `process`. Everything else in this recipe follows from that.

## 1. Know what you are rendering

[`apps/cli/src/report.ts`](../../apps/cli/src/report.ts) is the whole input: `violations`, `failures`, `filesScanned`.

**`failures` is not optional.** A file that could not be analysed has to survive into your output in some form — a formatter that renders only `violations` lets a partial scan read as a clean one, and the exit-code contract (`2` for any unanalysable file) then disagrees with what the user is looking at.

## 2. Write it

1. `apps/cli/src/formatters/<name>.ts`, exporting `format<Name>Report(report: ScanReport, options?): string`. Return the complete document **ending in a newline**.
2. Register it in [`src/formatters/render.ts`](../../apps/cli/src/formatters/render.ts): add the name to `OUTPUT_FORMATS` and a branch to `renderReport`. That is the only place formats are enumerated — commander derives `--format`'s `.choices()` from the same list, so an unknown format becomes a usage error (exit `2`) for free, and no command learns how many formats exist.
3. Read ambient state from the injected `CliIO` (`env`, `isTTY`), never from `process` — that is what keeps `src/cli.ts` branch-free and the decision unit-testable.

**Human formats** may use colour, through `stylesFor(colour)` in [`formatters/colour.ts`](../../apps/cli/src/formatters/colour.ts): roles that are either ANSI wrappers or the identity function, so layout code never branches on colour. Pad visible text _before_ styling — escapes have zero width, and padding after styling silently misaligns every column. Colour must stay decoration: anything it encodes must also be spelled out in words.

**Machine formats** get no colour at any `FORCE_COLOR` setting, and their shape belongs in [`@argus/api-contracts`](../../packages/api-contracts/README.md) as a zod schema, not in the formatter. Give the payload a `contractVersion`, keep the schema strict, and make the output deterministic (sort by file → position → rule id) so re-scanning unchanged sources produces byte-identical bytes. Keep stdout to the document alone: diagnostics go to stderr, or `argus check . -f json | jq` breaks.

## 3. Test it

- Unit-test the formatter against violations built through core's factories (`makeViolation` in [`tests/support.ts`](../../apps/cli/tests/support.ts)), never hand-shaped literals.
- **Machine formats: parse your own output and validate it against the schema** — that is the acceptance criterion, and it stops the test from re-implementing the shape it is checking.
- Add one end-to-end case in `tests/check.test.ts` (real pipeline, real files) and one flag-wiring case in `tests/main.test.ts` (`--format <name>`, plus the unknown-format usage error).
- If the format has a stdout-purity or environment guarantee, pin it in `tests/bin.test.ts` — the only suite that spawns the real executable, and the only evidence for anything `src/cli.ts` wires.

## 4. Sanity checklist

- Root gates green: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`, plus `pnpm boundaries`.
- `docs/guide/cli.md` documents the flag value, with a sample document and at least one real pipeline.
- `apps/cli/README.md` "Output: the formatters" gains a paragraph.
- New package (a schema package, say)? Run the new-package checklist: root `vitest.config.ts` projects entry, per-package `*-public-entry-only` cruiser rule, `Dockerfile.dev` mkdir + compose volume, README, `pnpm license-check`/`notices` if the dependency tree moved.

> Phase 8 moves reporting into its own package (`reports/formatters/`) for outputs that are not CLI-shaped (HTML, dashboards). The contract above — pure function, failures included, schema in `@argus/api-contracts` — is what should survive that move; update this recipe when it happens.
