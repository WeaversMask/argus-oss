# How Argus was built — the workflow

Argus was written almost entirely by AI agents. That is only worth mentioning if you can check the result, so this page is the check: the loop the work ran through, and for each guardrail in it, the file that implements it and a receipt — for most, one time it demonstrably caught something.

An **agent** here is a Claude model given the repository, a task, and a shell — it reads the plan, writes code, runs the tests, and opens a pull request. It does not merge. Nothing below relies on any _single_ agent being careful; the loop is built so that one agent's carelessness is caught by something that is not another agent's diligence.

## The loop

Six stages, in order, for every task — 52 merges to `main` at the time of writing. Several of the gates were themselves tasks, so the earliest commits in this history predate the machinery that now guards it: the review pass only became mechanical at [#17](https://github.com/WeaversMask/argus-oss/pull/17), and the boundary check at [#18](https://github.com/WeaversMask/argus-oss/pull/18). Before that they were rules in a document, which is precisely the weaker thing this page argues against.

```
   1. PICK              2. BRANCH             3. BUILD
   one task from   ──▶  one branch,      ──▶  under gates: lint · typecheck ·
   the phase file       one PR                build · test locally, then
                                              11 jobs in CI
                                                        │
        ┌───────────────────────────────────────────────┘
        ▼
   4. REVIEW             5. MERGE              6. ROTATE
   a second agent   ──▶  human only,      ──▶  tracker + handover rewritten
   in a fresh            never an agent        for the next session
   context, usually                                    │
   a different model                                   │
   family                                              ▼
                                              next session starts at 1
```

1. **Pick.** Tasks are specified up front in a phase file with dependencies and acceptance criteria ([phase 2](plan/phases/phase-02-mvp.md) is the current one). An agent takes the top task whose dependencies are met — it does not invent scope.
2. **Branch.** One task, one branch, one pull request. Plan or documentation changes that other tasks will read land first, as their own small PR, so nobody builds on unmerged text.
3. **Build.** Four gates locally before every push, eleven jobs in CI on every PR. Details below.
4. **Review.** A different agent, with none of the author's context, reviews the diff and posts its findings on the PR. CI fails an agent-authored PR if that evidence is missing.
5. **Merge.** The human maintainer, and only the human maintainer.
6. **Rotate.** The tracker — the live record of what is done, in flight, and next — and the handover — a written brief for whoever picks up next — are rewritten in the same PR. An agent's memory ends with its session; these two files are the record the next session starts from.

## The guardrails

Each of these is one paragraph, one mechanism, one receipt.

**A second agent reviews every agent-authored diff, and CI fails the PR without one.** The reviewer starts in a fresh context and is picked from a different model family than the author wherever possible — a same-model reviewer tends to rationalise past exactly what an independent one catches. Depth is tiered: a short verdict for docs-only or config-only diffs, a full risk-ranked packet for anything with executable logic. The gate is the [`review-gate` job](../.github/workflows/ci.yml), which fails a non-draft PR carrying no review evidence; the brief the reviewer follows is in the [execution protocol](plan/protocols/agentic-execution.md). Automated dependency-bump PRs are exempt and go straight to the maintainer, who reviews them at merge. Receipt: on [#39](https://github.com/WeaversMask/argus-oss/pull/39), the review reproduced a **silent file corruption** in the auto-fix engine — files rewritten wrongly while the tool reported success — and a second review then found a bug the first had missed.

**Only the human merges.** Agents may push branches and open pull requests; the merge is never theirs. `main` additionally requires a PR and enforces its checks on administrators too. Receipt: publicly checkable — `git log origin/main --merges` shows every merge commit authored by the maintainer, and none by an agent (52 of them at the time of writing).

**The gates run over the whole graph, never a slice.** `pnpm lint && pnpm typecheck && pnpm test && pnpm gates:check` at the repository root before every push. Running them per-package is faster and is banned for sign-off, because a filtered run bypasses the task graph and cannot see failures that live _between_ packages. Receipt: [#13](https://github.com/WeaversMask/argus-oss/pull/13) introduced a workspace dependency cycle that every filtered run passed and CI caught — which is why the root-only rule is now written into [CLAUDE.md](../CLAUDE.md). The last of the four is newest and exists because this list was itself wrong: `pnpm build` sat in it for the life of the project while running **zero tasks**, since no package is built, so every "gates green" claim that cited it asserted nothing. It was dropped from the list rather than deleted outright — the command still runs in CI and becomes real when the CLI is bundled — and `gates:check` now fails whenever a root gate stops reaching every package, including the day a `build` script appears ([OPS-07](https://github.com/WeaversMask/argus-oss/pull/52)).

**Architecture is machine-checked, not left to code review.** "The domain core may not import an adapter", "no package may reach into another's internals", "`packages/` may not import `apps/`" are [dependency-cruiser rules](../dependency-cruiser-rules.cjs) run by the `boundaries` job. Receipt: [#18](https://github.com/WeaversMask/argus-oss/pull/18) — every rule was **negative-tested**, meaning deliberately violated to confirm the build actually fails, then reverted. A guardrail nobody has seen fail is a guardrail nobody has tested.

**A secret cannot reach the remote.** Three layers: [pre-commit](../.husky/pre-commit) scans staged content, [pre-push](../.husky/pre-push) scans the exact range about to leave the machine, and the `secret-scan` CI job scans full history. Bypassing any layer requires a written justification under the [policy](SECURITY-NOTES.md). Receipt: [#14](https://github.com/WeaversMask/argus-oss/pull/14)'s review found that gitleaks **exits 0 when its own git query fails** — a scan that never ran was reporting success. The hook now inspects the output and fails closed, so a scan that did not complete blocks the push.

**No dependency runs an install script, and nothing is trusted while it is brand new.** Install scripts are blocked by default and no release younger than three days resolves at all ([`pnpm-workspace.yaml`](../pnpm-workspace.yaml), [ADR-0003](adr/0003-supply-chain-hardening-baseline.md)); an agent proposing a new external dependency escalates to the maintainer rather than installing it. Receipt: [#22](https://github.com/WeaversMask/argus-oss/pull/22) — tree-sitter's native-compile install scripts were reviewed and **denied**, and Argus loads the WebAssembly build instead ([ADR-0005](adr/0005-ast-adapter-wasm-tree-sitter.md)).

**Every third-party license is checked against an explicit allowlist.** [`scripts/check-licenses.mjs`](../scripts/check-licenses.mjs) runs in the `license` job against the policy in [ADR-0002](adr/0002-third-party-integration-and-licensing-policy.md); an unlisted license fails the build, and the four exceptions are each named and justified. Receipt: [this run](https://github.com/WeaversMask/argus-oss/actions/runs/30641037944) — 563 resolved packages checked, all clear. The same job verifies that [THIRD-PARTY-NOTICES](../THIRD-PARTY-NOTICES) still matches the tree, because a freshness claim nothing checks is a claim that eventually stops being true.

**Argus is held to its own bar.** The `dogfood` job runs `argus check .` over this repository on every PR and fails on any finding — plus a floor on files scanned, since a scan that silently matched nothing would otherwise pass as clean. Receipt: [#38](https://github.com/WeaversMask/argus-oss/pull/38) — the first whole-repo scan found **38 real violations in production source**. All 38 were fixed; none were added to the ignore list.

**Tests must cover the code, and the floors are enforced.** 737 tests cover 97.9% of statements and 94.3% of branches against floors of 85% and 80% pinned in [`vitest.config.ts`](../vitest.config.ts) — the suite fails below them. Where a defensive branch genuinely cannot be exercised, the exception is written down in that package's README rather than waved through. Coverage only proves the tests _execute_ the code, so a weekly [mutation run](../.github/workflows/mutation.yml) breaks the source deliberately and checks that some test notices; the baseline from [#19](https://github.com/WeaversMask/argus-oss/pull/19) was 85.74%. See the honest caveat below.

## What this does not protect against

A guardrail list that reads as flawless is a marketing page. Five real limits:

- **The review gate checks that a review happened, not that it was any good.** It searches the PR for an "Independent review" heading and passes if it finds one; it cannot judge what is written underneath. Review _quality_ therefore still rests on the reviewing agent and on the maintainer's read at merge. That is a deliberate trade — a gate simple enough to never misfire, rather than a clever one nobody trusts — but it is the softest link on this page, and it is a person, not a mechanism.
- **The report-only gate rotted, exactly as an unenforced gate does.** The weekly mutation job has failed since 2026-07-28 and nobody noticed, because it gates nothing. That 85.74% baseline is from 2026-07-12 and is stale — it is not cited as a current number anywhere in this repository, and fixing the job needs its own task. This is the strongest available evidence for the thesis of this page: the mechanisms that hold are the ones that can fail a build.
- **Four of the twelve CI jobs report without blocking.** The boundary, review, documentation-delta, and dogfooding jobs go red on failure but are not yet in the required-checks list, so they rely on the maintainer not merging a red PR. The other eight block outright — though one of those eight, `Build`, currently runs zero tasks, so it blocks on nothing (the bullet above). (This bullet read "three of eleven" until OPS-07: the documentation-delta job landed a day after it was written and was never counted. A hand-maintained count of mechanisms is itself a claim that rots.)
- **Small fixes made after a review are not re-reviewed.** When a review finding is fixed in the same PR, the merge review is the only second pair of eyes on the fix. That was a conscious ruling while diffs stay small and the project is one maintainer — it is recorded as an open decision, not overlooked.
- **One maintainer, one human reviewer.** Model diversity gives independence between agents. It does not give a second human opinion, and no mechanism here substitutes for one.

## Where this is written down

The rules above are not folklore; they are files, and an agent loads them at the start of every session.

- [`CLAUDE.md`](../CLAUDE.md) — what every session must do before it does anything else.
- [`plan/protocols/agentic-execution.md`](plan/protocols/agentic-execution.md) — pick-up, execution, the completion checklist, handover rotation.
- [`plan/00-principles.md`](plan/00-principles.md) — the engineering rules a review is conducted against.
- [`plan/03-documentation.md`](plan/03-documentation.md) — why documentation is captured per task instead of written at the end.
- [`IMPLEMENTATION.md`](IMPLEMENTATION.md) and [`HANDOVER.md`](HANDOVER.md) — the live state, and the brief for whoever picks up next.

If you want the code rather than the process, [`architecture.md`](architecture.md) is the map and [`dev/`](dev/) has the contributor recipes.
