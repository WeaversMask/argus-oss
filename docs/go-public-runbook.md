# Go-Public Runbook (maintainer-only)

> **Policy (maintainer directive, 2026-07-04):** going public is a voluntary,
> unscheduled, manual step performed by the maintainer alone — **never by an
> agent**. Agents never change repo visibility, never create public repos,
> and never push to the artifact repo below.

## Why two repos

On 2026-07-04 the history of this repo was rewritten to remove the
maintainer's personal email from all author/committer fields (name kept —
maintainer's call; email is the hard constraint). GitHub keeps pre-rewrite
commits reachable via `refs/pull/*` on **this** repo, so **this repo must
never be made public**. The clean-history artifact is:

- **`WeaversMask/argus-oss`** (private until the maintainer flips it) —
  scrubbed `main`, API-verified 0 personal-email hits at creation. Placeholder
  name; rename freely any time before going public.

Every commit made after 2026-07-04 is clean by construction (repo-local git
identity is the noreply address), so syncing the artifact is always a plain
fast-forward push.

## Steps (maintainer, ~15 min, any time)

1. **Verify this repo's `main` is still clean** (paranoia check, must print 0):
   `git log --format='%ae %ce' origin/main | grep -ci icloud`
2. **Sync the artifact:** `git push git@github.com:WeaversMask/argus-oss.git main:main`
3. **Optional renames:** `argus` → e.g. `argus-private-archive`, then
   `argus-oss` → `argus`. Reusing the name breaks links to this repo's old
   PRs (#1–#30) — the archaeology stays browsable in the renamed archive.
4. **Repo settings on the artifact — nothing migrates automatically:**
   - Branch protection on `main` (mirror this repo's rule: required checks,
     required PR reviews, no force pushes, no bypass)
   - Private vulnerability reporting toggle (SECURITY.md §Reporting relies on it)
   - Dependabot (config file travels; alerts/updates enablement is a setting)
   - Actions secrets when D-1 lands (`TURBO_*`)
5. **LICENSE:** resolve the "The Argus Authors" placeholder → **WeaversMask**
   before flipping (pseudonymous copyright holder, maintainer decision
   pending since P0-10).
6. **Flip visibility → Public** on the artifact repo.
7. Optional: GitHub profile display name currently shows the real name and is
   stamped on web-UI merge commits — email stays safe either way; renaming
   the profile to WeaversMask is cosmetic and entirely optional.

## Post-rewrite footnotes

- Old GitHub-created merge commits show **"unverified" signatures** in the
  rewritten history (hashes changed) — cosmetic, expected.
- Pre-scrub backup: `~/argus-pre-scrub-backup.bundle` on the maintainer's
  machine — contains the old emails by design; never push it anywhere;
  delete it once satisfied.
