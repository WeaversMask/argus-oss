# ADR-0006 — Auto-fix representation and safety strategy

**Status:** Accepted
**Date:** 2026-07-26
**Decision makers:** claude-sonnet-5 (P2-06 implementation), recorded per the escalation rule (a decision touching more than one package's public API)

---

## Context

P2-06 added `argus fix`: an `--dry-run`-capable command that applies mechanical edits for violations that offer one, then runs the touched file through Prettier. This is the CLI's first mutating command, and the phase doc calls it "the riskiest part of this phase" — round-trip safety (comments and significant whitespace never destroyed; `fix` then `check` shows no violations) is non-negotiable, not a nice-to-have.

Several cross-package decisions had to be made together: how a rule expresses "here is a safe edit", how that edit survives from a rule's `create()` closure through the engine to `apps/cli`, what happens when two violations propose overlapping edits, and where Prettier fits architecturally given it is the first external tool this repo calls programmatically rather than as an arm's-length subprocess. None of these are visible from any single package's diff, which is what puts this ADR in scope rather than a `.work/` note.

Investigated first and found to be true, not assumed: nothing fix-related existed anywhere in the codebase before this task (greenfield at the type/port/package level), and of the ten built-in rules, only `style/import-order` is realistically auto-fixable under a "formatting only" scope — the other nine need a semantic judgement call (renaming with every reference tracked, splitting a long function, writing real documentation) that no mechanical transform can safely make.

## Decision

1. **`Fix` is a new domain type**, `{ position: Position; replacement: string }`, smart-constructed and frozen like every other domain value (`packages/core/src/domain/fix.ts`). It is threaded additively: `RuleReport.fix?` → `CapturedReport.fix?` → `Violation.fix?`. No port signature changed — `RuleRunnerPort.run` still returns `Result<readonly Violation[], RuleExecutionError>`. A rule reports a fix the same way it reports a message: `context.report({ message, position, fix })`.

2. **A rule offers a fix only when it can prove the specific case is safe — never as a best-effort guess.** `style/import-order`'s fixer withholds the fix whenever the run of imports it would reorder contains anything other than `import_statement` nodes (a comment sitting between two of them would be silently stranded in the wrong place if the statements moved around it) or when two imports share one line (there is no way to reconstruct the whitespace that belonged between them, since a rule sees only the AST — `AstNode` never exposes raw source or byte offsets, a P1-03 scope limit this ADR does not revisit). A violation with no fix is still reported; under-fixing a case that cannot be proven safe is always preferred over a wrong edit. Gaps between reordered imports are reconstructed from line numbers alone (`"\n".repeat(nextLine - prevLine)`), reused **positionally** (the gap between original positions _i_ and _i+1_ separates whatever ends up at sorted positions _i_ and _i+1_) rather than reattached to specific statements, because there is exactly one fewer gap than there are imports.

3. **Conflict resolution is the applier's job, not the rule's.** `apps/cli/src/apply-fixes.ts` de-duplicates fixes by structural equality (a rule may attach the identical edit to every violation it resolves at once) and, for two different edits that still overlap after de-duplication, keeps the earlier-starting one and drops the rest. A rule never needs to reason about what else might be reported in the same file.

4. **Prettier is a whole-file finishing pass over files `fix` actually touched — never a repo-wide reformat.** `import-order`'s fix mechanically splices text; Prettier then normalises the result, which is what the phase spec's "delegated to Prettier for formatting rules" buys even for a non-formatting rule's fix. A file with zero applied fixes never reaches the formatter.

5. **Prettier is called programmatically, behind a new port (`FormatterPort` in `@argus/core`), implemented by a new package (`@argus/adapters-prettier`) — not a direct import from `apps/cli`, and not an arm's-length subprocess.** Every existing external-tool integration in this repo goes through a port (`AstParserPort` ← `TreeSitterAstParser`; the unimplemented-but-already-defined `ToolAdapterPort` and repository ports sketched ahead of their phases), and `docs/plan/01-repo-structure.md` already names `packages/adapters/prettier/` as this exact tool's home — the location is documented intent, not invention. ADR-0002's copyleft-isolation rationale for running tools as subprocesses does not apply here: Prettier is MIT-licensed and already a root devDependency; the port exists for the same reason every other one does (a contract test validates the real adapter in isolation; a fake remains available to any future caller), not for licence containment.

6. **The adapter resolves Prettier config relative to the project root it is constructed with, never `process.cwd()`.** `argus` can run from a subdirectory of the project it scans — `PrettierFormatter`'s constructor takes the project root explicitly and resolves every file against it before calling Prettier's API, avoiding the same class of bug P2-02 already fixed once for `ignore:` globs matching against the wrong base directory.

7. **Exit codes reinterpret `check`'s 0/1/2 differently for `--dry-run` versus a real run**, because the two modes answer different questions and one meaning would make one of the flows useless for CI: a real run reports **state** (`0` = no violations remain once the run finished), extending `check`'s own "violations exist" contract to "after fixing what I could". `--dry-run` reports **what an action would do** (`0` = fix would change nothing), the same idiom as `prettier --check`/`terraform plan`, because it cannot promise the repo would end up clean without writing anything.

## Consequences

### Positive

- Adding fix support required no changes to `RuleRunnerPort`, `Engine`, or `Runner`'s public contracts — every existing rule and every existing consumer of `Violation[]` is unaffected.
- The safety-over-coverage rule (decision 2) means `argus fix` can never be the cause of a lost comment or a corrupted file; the cost is that some real-world import blocks (ones with a comment or a same-line pair) will not be auto-fixed and still need a human.
- The port precedent (decision 5) means a second fixable rule that needs a genuinely different external formatter, or a test that wants to fake Prettier's behaviour, has a contract to conform to rather than a bespoke integration to invent.

### Negative

- Only one rule is fixable this task. The fix engine's generality (conflict resolution across multiple different fixes in one file, the `FormatterPort` abstraction) is proven correct by test but not yet exercised by a second real fixer — revisit if that generality turns out to be wrong-shaped once one exists.
- `--dry-run`'s exit code answering a different question than a real run's is a deliberate, documented asymmetry, but it is still an asymmetry a new contributor has to learn once (mitigated: spelled out in `docs/guide/cli.md`, `apps/cli/README.md`, and this ADR).

## Related

- [ADR-0002](./0002-third-party-integration-and-licensing-policy.md) — why Prettier's programmatic use does not trigger the copyleft-subprocess rule
- [ADR-0004](./0004-domain-model-boundary-semantics.md) — `Position`'s 1-based, end-exclusive convention that `Fix.position` reuses unchanged
- P1-03's `AstNode` scope decision (parent links and byte offsets deferred) — still the reason a rule reconstructs gaps from line numbers rather than raw offsets
- `.work/P2-06.md` (local, not committed) has the full blow-by-blow of the alternatives considered for each decision above
