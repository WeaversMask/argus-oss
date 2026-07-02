# ADR-0003 — Supply-Chain Hardening Baseline

**Status:** Accepted
**Date:** 2026-07-02
**Decision makers:** Maintainer (decisions approved in the 2026-06-12 security review session)

---

## Context

The 2026 npm supply-chain wave (Shai-Hulud, axios, node-ipc, @tanstack/\*, @antv/\*) delivers its payload at two moments: **resolution** of a freshly published malicious version, and **execution** of that package's install scripts. The repo's existing protections — committed lockfile with integrity hashes, `--frozen-lockfile` in CI, the planned [P0-07] advisory audit — cover locked state and after-the-fact detection, but not the moment a human or agent runs `pnpm add`/`pnpm update`.

Verified on this repo's toolchain (2026-06-12, pnpm 9.15.9): (a) a brand-new registry version is resolved immediately with no age gate, and (b) a dependency's `postinstall` script executes by default. `minimumReleaseAge` requires pnpm ≥10.16, so the gate and the pnpm upgrade are one change. Risks: R-012 (malicious fresh release), R-013 (covered separately by [P0-13]).

## Decision

1. **pnpm pinned to exact `11.5.3`** (`packageManager`), chosen as the newest 11.x published ≥3 weeks before adoption. Future pnpm bumps follow the same ≥3-week rule.
2. **`minimumReleaseAge: 4320`** (3 days, minutes) in `pnpm-workspace.yaml`; applies to all dependencies including transitives. **`minimumReleaseAgeExclude` stays empty** — the urgent-patch override is: add the package name, install, remove the entry again (procedure in [`SECURITY-NOTES.md`](../SECURITY-NOTES.md) §Supply-Chain Controls).
3. **Dependency build scripts blocked** — `allowBuilds: {}` makes the pnpm 11 block-by-default posture explicit. An entry may be added only after reviewing what the script does, with justification in the PR. Root project scripts (`prepare` → husky + gitleaks) are unaffected.
4. **v11 defaults recorded:** `blockExoticSubdeps` stays `true` (transitives must resolve from trusted sources); `trustPolicy` stays `"off"` for now — revisit with [P11-02]'s comprehensive audit.
5. **Node floor `>=22.13`** (pnpm 11.5.3's engine requirement; Node 20 reached end-of-life 2026-04-30). `.nvmrc` documents it for nvm users; [P0-13] pins CI's exact Node.
6. **Dependabot `cooldown` ([P0-13]) must match the 3-day window** so automated update PRs respect the same gate.

## Consequences

### Positive

- The unlocked moment (`pnpm add`/`update`) is now gated: a version younger than 3 days is refused with `ERR_PNPM_NO_MATURE_MATCHING_VERSION` (verified against a 1-day-old `@types/node` release on adoption day).
- Install-script payloads are neutralised by default; the empty `allowBuilds` map forces a conscious review for any exception.
- The lockfile format is unchanged (v9.0 is shared by pnpm 9–11) — no resolution churn from the upgrade itself.

### Negative

- Security patches are also delayed up to 3 days. Mitigation: P0-07's audit and Dependabot alerts surface urgent advisories; the exclude-list override exists for exactly that case.
- Contributors need Node ≥22.13 (pnpm itself is fetched automatically per `packageManager`). nvm users: `nvm use` reads `.nvmrc`.
- First install after a pnpm major bump prompts to purge `node_modules`; non-TTY environments need `--config.confirmModulesPurge=false` (CI sets `CI=true` and is unaffected).

## Related

- [ADR-0002](./0002-third-party-integration-and-licensing-policy.md) — the licensing side of third-party integration
- Risks R-012, R-013 in [`risks.md`](../risks.md); tasks [P0-07], [P0-13], [P11-02] in the phase docs
