# ADR-0008 — Scan Scope Lives in `@argus/orchestrator`, and Git Is Injected

**Status:** Accepted
**Date:** 2026-08-02 (taken with P2-05)
**Decision makers:** Taken by the implementing agent at P2-05 and merged by the maintainer. The two enforcing rules — `orchestrator-public-entry-only` and `orchestrator-no-infrastructure` — shipped in the same PR, each negative-tested against a probe import.

---

## Context

P2-05 asked for diff mode: `argus check --diff main` should analyse only the files a branch changed, and report only the violations on the lines it changed. Its specified output was `packages/orchestrator/src/diff-extractor.ts` — a package [`01-repo-structure.md`](../plan/01-repo-structure.md) has reserved since P0 for "scan execution orchestration" and which did not exist until now. So the task carried two questions at once: what that package is for, and where git goes.

Diff mode is not one job but two, and they have different natures.

**Deciding what changed** is a sequence of judgement calls, each of which is silently wrong in a way no output reveals:

- Compare against `main`'s tip, or against the commit you branched from? A two-dot `git diff main` reports everything that landed on `main` since the branch point — as reversals — so a scan attributes a colleague's work to you.
- Compare against `HEAD`, or against the working tree? The scanner opens files on disk, so line numbers must match those bytes; uncommitted edits have to be in the diff.
- Untracked files: git diffs only what it tracks, so a brand-new file has no diff at all. Skipping it reports zero violations for the newest code in the change.
- A renamed file with no content change produces no hunks, so every violation in it is suppressed.

**Running git** is a subprocess call. It has real concerns — argument arrays rather than shell strings, a `maxBuffer` large enough for a branch diff, turning a non-zero exit into a message — but no judgement.

The first is worth testing exhaustively. The second is worth testing once, against a real `git`.

## Decision

**`packages/orchestrator` owns which git commands to run and how to read them. It never runs one.**

1. Git arrives as `GitRunner` — `(args: readonly string[]) => Promise<Result<string, string>>` — a collaborator type declared in the orchestrator and implemented by `apps/cli`'s `gitRunner`.
2. `GitRunner` is **not** a `packages/core` port. Ports are domain contracts; the domain never asks what changed since `main`. This is a scan-scope concern, so its collaborator is declared where it is consumed.
3. `packages/orchestrator/src` imports no Node builtins, enforced by `orchestrator-no-infrastructure` — the same shape of rule as `core-no-node-builtins`, for a different reason: not purity, but keeping the decisions runnable by a second caller.
4. The package's scope is **what a scan covers**, not what it judges. Rules decide whether code is wrong; this decides whether the code should have been looked at.

### Alternatives rejected

- **A `VersionControlPort` in core, implemented by `packages/adapters/git/`.** The orthodox hexagonal answer, and the recipe in [`adding-an-adapter.md`](../dev/adding-an-adapter.md) says plainly that a port that does not exist is a core change needing its own ADR. Rejected because the port would be fiction: core has no concept a VCS serves. It would exist purely so an adapter had something to implement, and it would put a stable domain contract around one command shape that P2-05 alone determines. If Phase 5 or 6 grows a second VCS consumer, this becomes the right shape and this ADR should be revisited — the injected type is deliberately the same signature a port would carry.
- **Run git in the orchestrator directly.** One less indirection, and it would keep "the git logic" in one file. It also makes every test of the merge-base and untracked-file decisions build a real repository, so the twenty-odd diff shapes that matter (hunk headers with omitted counts, `/dev/null` targets, binary files, C-quoted paths, `\ No newline at end of file`) become expensive enough not to be written. The failure this design guards against is precisely the untested edge that returns _fewer_ changed lines.
- **Keep all of it in `apps/cli`, next to `discover.ts`.** There is real precedent — the CLI already does its own filesystem walking. Rejected on the phase-06 constraint recorded in [`phase-06-api-server.md`](../plan/phases/phase-06-api-server.md): routes call orchestrators, and `packages-never-import-apps` means a server could not reach a decision that lives in an app. Diff mode is exactly the sort of thing an API caller asks for.

## Consequences

### Positive

- The decisions are testable against canned git output: 42 orchestrator tests run with no repository on disk, covering diff shapes that would each need their own fixture repo otherwise.
- The subprocess is tested once, for real, in `apps/cli/tests/git.test.ts` — including that arguments are data, not shell input.
- `apps/cli` stays thin at the new edge: `git.ts` is ~50 lines with no knowledge of diffs.
- The package now exists with a stated purpose, so Phase 6 inherits a home for scan orchestration rather than a naming argument.

### Negative

- **One more indirection for a caller that only ever wires the same runner.** Today there is exactly one implementation of `GitRunner` and one consumer. The cost is paid now for a second consumer that Phase 6 predicts but has not delivered.
- **`GitRunner` is a contract with no contract test.** Port implementations in this repo get a `contract.test.ts` asserting the port's documented invariants (see `adapters-prettier`). A collaborator type declared in a consuming package has no such convention, so "must not throw" is enforced by the one implementation's own tests, not by anything a second implementation would inherit. If a second one appears, that gap closes or the type becomes a port.
- **The flag set and the parser are one unit split across two files.** `DIFF_FLAGS` in `diff-extractor.ts` pins the grammar `unified-diff.ts` reads. Relaxing a flag silently changes what parses; the coupling is documented in both files and in the package README, and nothing mechanically enforces it.
- Diff mode's correctness rests on git's output format, which is stable but not a contract Argus controls. The flags defend against local _configuration_ (`diff.external`, `textconv`, `color.ui`, `diff.noprefix`), not against a future git changing its diff grammar.

## Related

- [ADR-0004](./0004-domain-model-boundary-semantics.md) — the 1-based, end-exclusive position semantics the line filter reads; a violation ending at column 1 of line N does not occupy line N.
- [`packages/orchestrator/README.md`](../../packages/orchestrator/README.md) — public surface and the maintenance traps (path vocabulary on macOS, counting hunk bodies rather than scanning).
- [`guide/cli.md`](../guide/cli.md) — what `--diff` means for a user, including the table of what does and does not count as changed.
- [`phase-06-api-server.md`](../plan/phases/phase-06-api-server.md) — "routes call orchestrators from `packages/orchestrator`", the constraint that ruled out keeping this in the CLI.
