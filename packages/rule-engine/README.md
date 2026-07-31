# `@argus/rule-engine`

> The dispatch engine behind core's `RuleRunnerPort` — walks a parsed file's AST **once** and dispatches each node to the rules subscribed to its type. The hottest code path in the system, benchmarked from day one.

## Purpose

`rule-engine` owns rule execution: registering rule modules, compiling their listeners into per-node-type dispatch tables, walking the tree, and turning rule reports into validated, deterministic `Violation`s. Rules see only a frozen `RuleContext` (file, language, layer, options snapshot) and report through it — they cannot mutate the AST, the context, or the run. It does **not** parse (that's `@argus/ast`), decide which rules are active (config, P1-05), or ship any actual rules (Phase 2).

The engine is domain-side orchestration: it depends on `@argus/core` only and walks core's `AstNode` view with its own iterative traversal — it never imports an adapter package.

## Public surface

| Export                                                         | Kind  | Summary                                                                                                                                                                                                                                          |
| -------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Engine`                                                       | class | Implements `RuleRunnerPort.run`; `register(module)` is the only integration point for a new rule; `rules` lists registered definitions. Never throws — every rule failure is an attributed `Result`                                              |
| `Runner` (`RunSummary`, `FileRunFailure`)                      | class | Multi-file orchestration over any `RuleRunnerPort`: runs files sequentially in input order, aggregates violations, skips-and-collects failed files                                                                                               |
| `RuleModule`, `RuleContext`, `RuleListeners`, … (`RuleReport`) | types | The rule-author contract — see [`docs/dev/adding-a-rule.md`](../../docs/dev/adding-a-rule.md). `RuleReport.fix` (P2-06) is an optional `Fix` a rule can attach when it can prove an edit safe; threaded onto the resulting `Violation` unchanged |

## How it fits

- **Depends on:** `@argus/core` (the port it implements + domain factories), `neverthrow`. Nothing else — no adapter packages.
- **Consumed by:** scan orchestration (Phase 2) and every rule package to come.
- **Boundary rules:** imports land on public entries only (`rule-engine-public-entry-only` in [`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs)).

## Usage

```ts
import { Engine, Runner } from "@argus/rule-engine";
import type { RuleContext } from "@argus/rule-engine";
import { rule, ruleId } from "@argus/core";

const engine = new Engine();
engine
  .register({
    rule: rule({
      id: ruleId("style/no-let")._unsafeUnwrap(),
      name: "no-let",
      description: "Prefer const over let.",
      defaultSeverity: "warning",
    })._unsafeUnwrap(),
    create: (context: RuleContext) => ({
      let: (node) => {
        context.report({ message: "Use const.", position: node.position });
      },
    }),
  })
  ._unsafeUnwrap();

const result = await engine.run({ parsed, activations }); // Result<readonly Violation[], RuleExecutionError>
const summary = await new Runner(engine).runAll(inputs); // { violations, failures }
```

## Design decisions (the ones rules depend on)

- **One shared walk, no per-rule flow control.** All active rules ride one traversal; `skip`/`stop` would let one rule starve the others, so listeners return `void`. `@argus/ast`'s `visit` keeps those levers for standalone use.
- **Selectors:** `"<nodeType>"` (enter/pre-order), `"<nodeType>:exit"` (post-order), `"*"`/`"*:exit"` (every node). Node types include anonymous grammar tokens (`"let"`, `"("`) — P1-03 convention. The literal `*` and `:` tokens are shadowed by selector syntax — match them from a wildcard listener (documented limitation, review #24).
- **Rules are synchronous.** A listener or `create()` returning a Promise is a contained rule failure, not a silent skip — async errors must not escape the engine's containment.
- **Failure policy is layered.** A rule crash (throw, invalid selector, invalid report, unregistered activation) fails that **file's** run with a `RuleExecutionError` attributed via `ruleId` ("no silent suppression"); the `Runner` above skips-and-collects so one bad file cannot sink a scan.
- **Determinism end to end.** Same input ⇒ same violations, including ids: violation ids are built from file + rule + position + report ordinal (no randomness in the domain path). Output order is the port contract: start position, ties by rule id, then end position.
- **Severity is configuration.** Violations carry the activation's severity, never the rule's default; `"off"` activations are skipped before dispatch.
- **A fix is optional and additive (P2-06).** `report({ ..., fix })` threads straight through to `Violation.fix` — the engine neither validates that a fix is _safe_ (that's the rule's own judgement call, see the recipe) nor requires one. `RuleRunnerPort`'s signature is unchanged; nothing downstream of `Violation[]` had to change to support fixes.

## Maintenance notes

- **Performance:** `tests/perf/engine-benchmark.test.ts` asserts the P1-04 acceptance number (1000 nodes × 50 rules < 50ms) locally and gates CI against the committed baseline in `tests/perf/baseline.ts` on gross regressions only (median × 20 — an accidental once-per-rule walk is ~50×). Last recorded: median 0.49ms on M2. Re-baseline via PR only.
- **Uncovered defensive branches (two):** the generated-id validation failure (unreachable by construction — the id is URI-encoded path + validated rule id + digits, all inside the opaque-id charset; kept so charset drift fails loudly) and `run()`'s outer catch (makes "never throws" structural rather than dependent on `runSync`'s internal exhaustiveness — review #24).
- **AST immutability is the adapter's guarantee.** The engine relies on `readonly` types and does not re-freeze nodes on the hot path; `@argus/ast` freezes everything it emits, but `AstParserPort` does not yet _mandate_ freezing (review #24) — revisit the port TSDoc when a second parser adapter appears.
- Private workspace package; not published.
