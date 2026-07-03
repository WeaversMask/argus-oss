# Contributing to Argus

Argus is in early development (Phase 0) with a solo maintainer. Work happens task-by-task against the plan in [docs/plan/](docs/plan/); current state is in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md). The gates below are enforced even while the codebase is small.

## Licensing guardrails (non-negotiable — ADR-0002)

[ADR-0002](docs/adr/0002-third-party-integration-and-licensing-policy.md) is the governing policy. PRs that violate it will be rejected regardless of technical merit:

1. **Never vendor third-party tools.** No tool binaries, no copied tool source, no git submodules, no committed third-party rulesets. External engines are prerequisites the user installs (see [README](README.md)).
2. **Copyleft engines are subprocess-only.** TruffleHog (AGPL-3.0) and the Semgrep engine (LGPL-2.1) are invoked as arm's-length subprocesses behind the `ToolAdapter` boundary — never imported, linked, FFI'd, or bundled. All external tool CLIs are reached through that boundary.
3. **Never commit Semgrep registry rules** or rule packs — their license restricts redistribution. Rule sources are: runtime fetch, user-supplied config, the permissive Opengrep fork, or first-party rules written in this repo.
4. **Every new dependency must carry an allowlisted license:** MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, Unlicense, CC0-1.0, BlueOak-1.0.0, Python-2.0. Dependencies under GPL/AGPL/LGPL (as linked code), SSPL, or Commons-Clause are refused. MPL-2.0 is allowed only as a **named, maintainer-reviewed exception** (currently the `lightningcss*` dev-only transitives). The automated CI gate arrives with P0-12; until then this list is enforced in review.
5. **Keep notices current.** If your change alters the dependency tree, regenerate [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) with `pnpm notices` in the same PR.
6. **No prebuilt images with engines baked in.** A Dockerfile here is a build recipe (ADR-0002 §D); publishing an image that redistributes the copyleft engines requires its own license review first.

## Adding a dependency

- Justify it — prefer standard-library or first-party solutions. Verify the package name against the registry before installing (typosquats).
- Exact-pin the version. Installs refuse versions younger than 3 days (`minimumReleaseAge`, [ADR-0003](docs/adr/0003-supply-chain-hardening-baseline.md)); the urgent-security-patch override procedure is in [docs/SECURITY-NOTES.md](docs/SECURITY-NOTES.md).
- Dependency lifecycle scripts are blocked by default (`allowBuilds`); a dependency that genuinely needs a build step requires an explicit allowlist entry plus justification.
- The license must pass guardrail #4, and notices must be regenerated (guardrail #5).

## Workflow

- **One task = one branch = one PR**, branched from `main`. PRs follow [docs/plan/templates/PR.template.md](docs/plan/templates/PR.template.md) and link a task ID.
- **Conventional commits** with types `feat|fix|chore|refactor|docs|test` (commit-msg hook enforces this).
- **Hooks are law.** Pre-commit runs ESLint (check-only), Prettier (auto-fix + re-stage), and a gitleaks scan of staged content. Never use `--no-verify`; a scoped `SKIP=<gate>` requires written justification per [docs/SECURITY-NOTES.md](docs/SECURITY-NOTES.md).
- **Quality bars:** tests with every PR (≥85% line / ≥80% branch on changed code), lint and typecheck clean — see [quality-gates.md](docs/plan/protocols/quality-gates.md) and [00-principles.md](docs/plan/00-principles.md).
- The maintainer merges; contributors (human or agent) never merge their own PRs.
