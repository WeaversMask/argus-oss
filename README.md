# Argus

Deterministic, architecture-aware code-quality platform for TypeScript monorepos: static analysis, layer/dependency-rule enforcement, security scanning, and reporting — built by orchestrating proven open-source engines behind clean adapter boundaries. No AI in the scan path: same input, same result.

> **Status: pre-alpha (Phase 0 — Foundation).** Toolchain, CI, and governance are being laid down; there is no runnable scanner yet. Current state lives in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

## Posture

Argus is published as a **public, source-only repository for others to read and reuse**. It is **not sold** and **not operated as a hosted service**. The repository ships source code plus dependency manifests — no vendored third-party binaries, tool source, or rulesets. The governing policy is [ADR-0002](docs/adr/0002-third-party-integration-and-licensing-policy.md).

## External tools / Prerequisites

Argus delegates heavy scanning work to existing engines. The engine binaries below are **not bundled or redistributed with Argus — you install them yourself**, and each runs under its own license:

| Tool                                                        | Role                       | License            | How Argus uses it                                   |
| ----------------------------------------------------------- | -------------------------- | ------------------ | --------------------------------------------------- |
| [TruffleHog](https://github.com/trufflesecurity/trufflehog) | secret detection           | AGPL-3.0           | user-installed binary, arm's-length subprocess only |
| [Semgrep](https://github.com/semgrep/semgrep)               | security patterns          | LGPL-2.1 (engine)¹ | user-installed binary, arm's-length subprocess only |
| [osv-scanner](https://github.com/google/osv-scanner)        | dependency vulnerabilities | Apache-2.0         | user-installed binary, subprocess                   |
| [jscpd](https://github.com/kucherenko/jscpd)                | copy-paste detection       | MIT                | npm dependency (linked library)                     |
| [Prettier](https://github.com/prettier/prettier)            | format checking            | MIT                | npm dependency (linked library)                     |
| [Tree-sitter](https://github.com/tree-sitter/tree-sitter)   | parsing                    | MIT                | npm dependency (linked library)                     |

¹ Semgrep **registry rules** carry a separate license that restricts redistribution. Argus never embeds them: rules are fetched at runtime, supplied by the user, sourced from the permissive Opengrep fork, or first-party ([ADR-0002 §C](docs/adr/0002-third-party-integration-and-licensing-policy.md)).

Copyleft engines are never imported, linked, or vendored — subprocess only, behind the `ToolAdapter` boundary (ADR-0002 §A/§B). Adapters for these tools land in Phase 4; the integration posture is fixed now, ahead of that code (of the six, only Prettier is in today's tree, as a devDependency). Tool licenses re-verified 2026-07-03.

## Development setup

- **Node** — the version pinned in [`.nvmrc`](.nvmrc) (`nvm use`); the exact floor is enforced via `engines.node` in [package.json](package.json).
- **pnpm** — the exact version pinned in `package.json` → `packageManager`; activate with `corepack enable`. Supply-chain posture (3-day minimum release age for new versions, dependency install scripts blocked by default) per [ADR-0003](docs/adr/0003-supply-chain-hardening-baseline.md).
- `pnpm install` — also installs the git hooks (husky + repo-local gitleaks).
- Everyday commands: `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm build`.

## License

[MIT](LICENSE). Third-party attributions: [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) (regenerate with `pnpm notices`). Contribution rules, including the licensing guardrails: [CONTRIBUTING.md](CONTRIBUTING.md).
