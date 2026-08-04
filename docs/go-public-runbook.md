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

## Readiness sweep — verified 2026-08-04 (OPS-05)

Everything in this section is **already done**. It is recorded here so the next
sweep re-runs the same checks rather than reinventing them, and because three of
them are not in the numbered steps below at all.

| Check                                                                         | Result                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Identity fields, all publishable refs (step 1)                                | **0** personal-email hits · 267 commits · 534 fields · 3 emails, all safe                         |
| Personal email in commit messages / bodies / trailers                         | **0** — only `noreply@anthropic.com` (167) and `support@github.com` (13)                          |
| Personal email or home path ever written into **file content** (`git log -S`) | email **never**; home path **yes — 1 line, now fixed**, see below                                 |
| Annotated tags (they carry their own tagger identity)                         | **0** tags exist on origin                                                                        |
| Working tree vs [SECURITY-NOTES](./SECURITY-NOTES.md) personal-data rules     | 1 finding, fixed; no env/key/IDE/db files; no non-loopback IPs; no hostname; `.claude/` untracked |
| **PR + issue + review text** (public on flip, not covered by any step below)  | 1.05 MB swept, all PRs/issues/comments/reviews — **0** personal identifiers, **0** emails         |
| **Actions run logs** (public on flip, not covered by any step below)          | **900 job logs / 31.6 MB** — **0** hits, against a live sanity match (see the caveat below)       |
| Retired `WeaversMask/argus` still private                                     | ✅ private — but **not yet archived**, still recommended                                          |

**The one finding.** `docs/handovers/p2-01-builtin-rules-handover.md` carried an
absolute `cd` into the maintainer's macOS home directory — a home-directory path,
which [SECURITY-NOTES §Personal Data of Contributors](./SECURITY-NOTES.md) forbids
outright. Introduced 2026-07-24 (`d1cd559`), it survived 93 commits and reached
**two** files — `docs/HANDOVER.md` (9 commit-file pairs) and the p2-01 archive
(103) — when handover rotation copied it forward. **Fixed in the tree** at OPS-05,
now reading `cd <repo-root>`. (The surrounding _bullet_ travelled further, into the
p2-02/03/04 archives, but those had already dropped the absolute path.)

> The literal string is deliberately **not** reproduced here. Quoting a finding
> verbatim in the document that records its removal puts it straight back into the
> tree — which is exactly what the first draft of this section did, and what the
> re-run of the scan below caught.

> **It remains in history, by maintainer ruling (2026-08-04), and that is deliberate.**
> A rewrite would invalidate every commit hash and still not reach the `refs/pull/*`
> copies GitHub retains — the same trap that makes the retired repo unpublishable.
> The disclosure is a macOS username that is the already-public profile display name
> with the space removed, so the rewrite would buy close to nothing. Re-open this only
> if the display name itself ever becomes something to protect.

### Re-running the sweep

**Tree scan** — fast, and the check that actually found something:

```bash
git grep -nIiE '/Users/[a-z0-9._-]+|C:\\Users\\[a-z0-9._-]+'
```

Expect **exactly two hits, both in `docs/SECURITY-NOTES.md`** — the rule's own
placeholder illustration, and the source-map note. Anything in any other file is a
finding. The count and the file are the assertion; deliberately **not** the line
numbers, which any edit above them silently falsifies. Neither example is restated
here, because a document that spells the pattern out becomes a third hit and
quietly breaks its own expected count — the first draft of this section did exactly
that, reintroducing the path it was recording the removal of. Note this scans the
**working tree**; appending `HEAD` scans the last commit instead, which will still
show a path you have fixed but not yet committed.

**PR, issue and review text** — everything written around the code, public on flip:

```bash
R=WeaversMask/argus-oss
{ gh api --paginate "repos/$R/pulls?state=all&per_page=100" --jq '.[]|.title,.body'
  gh api --paginate "repos/$R/issues?state=all&per_page=100" --jq '.[]|.title,.body'
  gh api --paginate "repos/$R/issues/comments?per_page=100"  --jq '.[].body'
  gh api --paginate "repos/$R/pulls/comments?per_page=100"   --jq '.[].body'
} > /tmp/ghtext.txt
wc -c /tmp/ghtext.txt                                    # size floor: must be MBs
grep -c 'WeaversMask' /tmp/ghtext.txt                    # sanity: must be non-zero
grep -oiE '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' /tmp/ghtext.txt | sort | uniq -c
```

**Actions run logs** — also public on flip, and the slowest check by far:

```bash
R=WeaversMask/argus-oss; mkdir -p /tmp/joblogs
gh api --paginate "repos/$R/actions/runs?per_page=100" --jq '.workflow_runs[].id' |
  while read -r run; do gh api "repos/$R/actions/runs/$run/jobs?per_page=100" --jq '.jobs[].id'; done |
  head -900 |
  xargs -P 10 -I{} sh -c "gh api repos/$R/actions/jobs/{}/logs > /tmp/joblogs/{}.log 2>/dev/null || true"
cat /tmp/joblogs/*.log > /tmp/alllogs.txt
grep -c '/home/runner' /tmp/alllogs.txt                  # sanity: must be non-zero
grep -oiE '/Users/[a-z0-9._-]+' /tmp/alllogs.txt | sort | uniq -c
```

> **The sanity line in each block is not decoration.** Both of these checks
> produced a false pass during OPS-05 before it was added: `gh run view --log`
> returns an **empty file with exit 0** when logs are unavailable, and `grep -c`
> scores an empty file as zero hits — indistinguishable from a clean sweep.
> A count that must be non-zero is what proves the scan ran at all. Same reason
> the size floor is printed rather than assumed.
>
> **Scope caveat, deliberately recorded:** the log sweep covers the **most recent
> 900** of roughly 2,556 job records. GitHub expires older logs, so the full set is
> not retrievable, and 900 already takes several minutes at ten-way parallelism.
> The two residual hits it reports are `docs.github.com` URL fragments appearing in
> dependency-update logs, matched only because the scan is case-insensitive. They are
> not home paths.
>
> **A standing hazard for this whole file:** the tree scan is case-insensitive and
> matches a path shape this document keeps needing to talk about, so spelling that
> shape out anywhere in here adds a hit and silently falsifies the expected count
> above. It happened three times while OPS-05 was being written. Describe the pattern;
> do not write it.

## Steps when going public (maintainer, ~10 min, any time)

1. **Paranoia check.** Scan **every ref GitHub will publish**, not just `main` —
   `refs/pull/*` is the one that matters, because GitHub keeps those forever and
   they outlive branch deletion. That is precisely what makes the retired repo
   permanently unpublishable, and `origin/main` alone would not show it.

   ```bash
   git fetch -q origin '+refs/pull/*:refs/remotes/origin-pr/*' &&
     git log --glob='refs/remotes/origin/*' --glob='refs/remotes/origin-pr/*' \
       --format='%ae%n%ce' | sort | uniq -c | sort -rn
   ```

   **Read the output, do not grep it.** It prints every distinct author/committer
   address with a count, so a pass looks like _exactly three known addresses and a
   plausible total_ — the `WeaversMask` noreply, `noreply@github.com` (the web-UI
   committer), and Dependabot's. Last run 2026-08-04 (OPS-05, with that task's own
   branch pushed): **0 personal addresses over 267 commits / 534 identity fields**
   — 434 / 79 / 21 respectively. Expect the total to have grown, never shrunk; a
   figure _below_ this means the scan is seeing less than it did, which is the
   failure this step is shaped to make visible.

   > **Why this shape, and not `| grep -ci icloud`.** That was the previous
   > version and it failed two ways at once. It is a **single-vendor substring
   > match**, so a personal address at any other provider passes silently. And it
   > **fails open**: `grep -c` prints `0` identically whether the scan found
   > nothing or ran against nothing, so if the fetch fails — expired auth, a fresh
   > clone, or after the rename in step 3 — the globs match no PR refs, the scan
   > silently narrows back to the too-small `origin/*` set this step exists to
   > replace, and it still reads as a pass. The `&&` and the visible per-address
   > counts are the fix: a shrunken scope is now something you can see.
   >
   > Beware the shell too: in **zsh**, `$(git for-each-ref …)` unquoted does **not**
   > word-split the way bash does, so passing a ref list that way hands `git log`
   > one malformed argument — and with `2>/dev/null` appended it prints `0` and
   > looks like a pass. Use `--glob`, which is also load-bearing rather than
   > stylistic: `git for-each-ref 'refs/remotes/origin-pr/*'` returns nothing,
   > because the two take different glob semantics.

2. **LICENSE:** ✅ **done** — resolved to `Copyright (c) 2026 WeaversMask` in OPS-05
   (2026-08-04), closing the placeholder pending since P0-10. Nothing to do at flip time.
3. **Optional renames:** archive/rename the retired repo (e.g.
   `argus-private-archive`), then rename this one to `argus`. Reusing the
   name breaks links to the retired repo's PRs — the archaeology stays
   browsable under its new name.
4. **Public-only settings on this repo** (cannot be pre-set while private):
   - Private vulnerability reporting toggle (SECURITY.md §Reporting relies on it)
   - Review the Actions/fork-PR permission defaults GitHub applies on flip.
     **Baseline measured 2026-08-04, while private** — compare against these
     _after_ the flip, since going public is what can change them:
     `default_workflow_permissions=read`, `can_approve_pull_request_reviews=false`,
     `allowed_actions=all`. Repo secrets: **none configured** (the `TURBO_*` pair
     is still pending Open Decision D-1) — a visibility flip never exposes secret
     _values_, but it does let fork PRs run workflows, so set them after, not before.
5. **Flip visibility → Public**, then **activate the README badges.** `README.md`
   opens with a staged `<!-- BADGES … -->` block; its own instructions say to delete
   the entire comment and put back only its two badge lines. Do not un-comment it in
   place — that publishes the staging note at the top of the most-read page in the
   repo instead of the badges.
6. **Immediately after the flip — public-only quality layers** (maintainer-approved 2026-07-07):
   - Enable **CodeQL default setup** (Settings → Code security and analysis).
     Free semantic SAST for public repos, low-noise; gitleaks covers secrets,
     CodeQL covers code-level vulnerability patterns — the one static-analysis
     layer the private repo cannot have.
   - Run **OpenSSF Scorecard** once against the repo and add the badge/action
     if the score is worth showing — it should be: pinned deps, blocked
     install scripts, SHA-pinned actions, and branch protection are its
     heavyweight criteria and all are already in place.
7. Optional, cosmetic: the GitHub profile display name (real name) is stamped on
   commits **the web UI created or rewrote** — the email stays safe either way.
   Measured on `origin/main` 2026-08-04 (OPS-05): **86 of 242 commits**, in two
   distinct shapes that a `%an`-only check would half-miss —
   **59** web-UI merge commits carry it as the _author_ name, and **27** commits
   rewritten by a web-UI "Update branch" / "Rebase and merge" carry it as the
   _committer_ name, which is invisible unless you ask for `%cn`. **Zero**
   locally-made commits are affected: the repo-local identity is the noreply
   address, so every commit written on the maintainer's machine is already clean.
   The name is public on the GitHub profile by choice, so this stays optional.

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
