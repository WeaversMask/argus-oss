# Phase 9 — CI/CD Integrations

> **Self-contained phase doc.** When done, set Current Phase to P10 and load [`phase-10-lsp-ide.md`](./phase-10-lsp-ide.md).

**Duration:** ~2 weeks
**Demoable:** ✅ PR decoration on a real OSS project.
**Prerequisites:** Phase 8 complete

---

## Goal

Native PR decoration on GitHub, GitLab, Bitbucket. Public Docker image. Marketplace listings.

---

## Required Reading Before Starting

- [`../01-repo-structure.md`](../01-repo-structure.md) — `packages/ci-adapters` layout

---

## Tasks

### [P9-01] GitHub Action
- **Deps:** P8 complete
- **Outputs:** Composite action, published to GitHub Marketplace
- **Acceptance:** PR comments, check runs, annotations on changed lines
- **Effort:** M

### [P9-02] GitLab Component
- **Deps:** P9-01
- **Outputs:** Includable CI component
- **Acceptance:** MR notes, pipeline status, code quality artefacts
- **Effort:** M

### [P9-03] Bitbucket Pipe
- **Deps:** P9-01
- **Outputs:** Bitbucket Pipeline integration
- **Effort:** M

### [P9-04] Production Docker image
- **Deps:** P9-01
- **Outputs:** Multi-arch image (amd64 + arm64), published to GHCR and Docker Hub
- **Acceptance:** <300MB compressed; signed with cosign; SBOM attached
- **Effort:** M

### [P9-05] PR decoration via Octokit / gitbeaker
- **Deps:** P9-01, P9-02
- **Outputs:** Inline review comments, check run status
- **Acceptance:** Duplicate comments suppressed on re-runs; comments updated, not appended
- **Effort:** L

---

## Phase 9 Exit Criteria

- [ ] Public Marketplace listings live (GitHub and GitLab)
- [ ] End-to-end PR review on a real OSS project
- [ ] Docker image signed and published
- [ ] Phase handover documents release process and integration testing strategy

---

## Phase-Specific Notes

- **GitHub Action vs. Docker action:** start with a composite action that pulls the Docker image. Faster startup than a Node action; same UX for users.
- **PR comment deduplication** is harder than it looks. Use a hidden marker in comment text (`<!-- argus:scan-id:xxx -->`) and update the comment on re-runs rather than posting new ones.
- **Check runs vs status checks:** use check runs (newer API). They support annotations on specific lines, which status checks don't.
- **GitLab Code Quality artefact format** is different from SARIF. Provide both — SARIF for GitHub, Code Quality JSON for GitLab.
- **Marketplace listings need review.** Allow time for GitHub's verification process (1–2 weeks typically).

---

## Definition of Done for Phase 9

The next agent can:
1. Add the GitHub Action to any repo and see PR decoration immediately
2. Pull the Docker image and run scans without npm installation
3. Start Phase 10 with all integrations in production
