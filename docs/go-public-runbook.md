# Go-Public Runbook (maintainer-only)

> **Policy (maintainer directive, 2026-07-04):** going public is a voluntary,
> unscheduled, manual step performed by the maintainer alone — **never by an
> agent**. Agents never change repo visibility and never create public repos.

## The two repos

On 2026-07-04 the git history was rewritten to remove the maintainer's
personal email from all author/committer fields (name kept — maintainer's
call; the email is the hard constraint). Same day, all work moved to the
clean-history repo:

- **`WeaversMask/argus-oss` — THIS repo, the live working repo.** Clean
  history from birth (API-verified 0 personal-email hits at migration);
  every commit after 2026-07-04 is clean by construction (repo-local git
  identity is the noreply address). Going public = flipping **this** repo's
  visibility. The name is a placeholder — rename freely before publishing.
- **`WeaversMask/argus` — the retired pre-scrub repo. Must NEVER go
  public:** its `refs/pull/*` keep pre-rewrite commits (with the personal
  email) fetchable. It holds the old PR/issue archaeology (#1–#31).
  Recommended: GitHub **Settings → Archive this repository** (read-only).
  Agents never push there.

## Steps when going public (maintainer, ~10 min, any time)

1. **Paranoia check** (must print 0):
   `git log --format='%ae %ce' origin/main | grep -ci icloud`
2. **LICENSE:** resolve the "The Argus Authors" placeholder → **WeaversMask**
   (pseudonymous copyright holder; pending since P0-10).
3. **Optional renames:** archive/rename the retired repo (e.g.
   `argus-private-archive`), then rename this one to `argus`. Reusing the
   name breaks links to the retired repo's PRs — the archaeology stays
   browsable under its new name.
4. **Public-only settings on this repo** (cannot be pre-set while private):
   - Private vulnerability reporting toggle (SECURITY.md §Reporting relies on it)
   - Review the Actions/fork-PR permission defaults GitHub applies on flip
5. **Flip visibility → Public.**
6. **Immediately after the flip — public-only quality layers** (maintainer-approved 2026-07-07):
   - Enable **CodeQL default setup** (Settings → Code security and analysis).
     Free semantic SAST for public repos, low-noise; gitleaks covers secrets,
     CodeQL covers code-level vulnerability patterns — the one static-analysis
     layer the private repo cannot have.
   - Run **OpenSSF Scorecard** once against the repo and add the badge/action
     if the score is worth showing — it should be: pinned deps, blocked
     install scripts, SHA-pinned actions, and branch protection are its
     heavyweight criteria and all are already in place.
7. Optional, cosmetic: the GitHub profile display name (real name) is stamped
   on web-UI merge commits — the email stays safe either way.

## Before the first npm publish (separate step, any time after going public)

- **Resolve Open Decision D-5 first** (see `IMPLEMENTATION.md`): `@argus/core`
  is deliberately buildless (`exports` → `src/`) and the workspace's turbo
  cycle-break depends on that (#13 review finding). Publishing requires dist
  artifacts, so the restructure in D-5's recommendation (extract the shared
  vitest config into a leaf package, then give core a normal build edge)
  must land **before** any build step is added.
- **Re-run the full-tree audit at `high` and triage anything it finds:**
  `pnpm audit --audit-level=high`. Since 2026-07-25 the CI gate blocks on
  `high` only for the **shipped** tree (`--prod`) and on `critical` for
  everything else (SECURITY-NOTES §6). That split is safe precisely because
  nothing publishes today — at first publish the prod/dev boundary stops being
  cosmetic and starts deciding what ships to users. Confirm here that every
  dependency is classified correctly and that nothing dev-scoped is reachable
  from a published artifact.
- `NPM_TOKEN` secret (P0-09 admin item) — set at this moment, not before.

## Already replicated on this repo (2026-07-04 migration)

Branch protection on `main` (6 required checks, strict, required PRs, no
force pushes, no admin bypass), Dependabot version updates + alerts +
automated security fixes. Secrets (`TURBO_*`) still pending Open Decision
D-1 — set them here, not on the retired repo.

## Footnotes

- Old GitHub-created merge commits show **"unverified" signatures** in the
  rewritten history (hashes changed) — cosmetic, expected.
- Pre-scrub backup: `~/argus-pre-scrub-backup.bundle` on the maintainer's
  machine — contains the old emails by design; never push it; delete when
  satisfied.
