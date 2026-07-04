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
6. Optional, cosmetic: the GitHub profile display name (real name) is stamped
   on web-UI merge commits — the email stays safe either way.

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
