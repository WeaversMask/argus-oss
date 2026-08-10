# Security Policy

Argus is a pre-1.0 project with a solo maintainer. This policy deliberately
promises only what can actually be kept.

## Supported Versions

| Version         | Supported |
| --------------- | --------- |
| `main` (latest) | ✅        |
| anything older  | ❌        |

There are no published releases yet; security fixes land on `main`.

## Reporting a Vulnerability

**Do not open a public issue for security reports.**

Use GitHub's private vulnerability reporting for this repository — it is
**enabled** (since 2026-08-10), so the form below is live:

**→ [Report a vulnerability privately](https://github.com/WeaversMask/argus-oss/security/advisories/new)**

Equivalently: the repository's **Security** tab → _Report a vulnerability_.
Reports go privately to the maintainer and are not publicly visible. If you
cannot use that form for any reason, open a **public issue containing no
technical detail** — just asking for a private channel — and it will be
followed up.

- Best-effort acknowledgment within **7 days** — usually much faster,
  occasionally slower; there is no paid on-call behind this repo.
- Coordinated disclosure: please allow a reasonable window for a fix to land
  before publishing details. Credit is given in the advisory unless you
  prefer otherwise.
- No bug bounty is offered.

Alongside reports, this repository runs
[CodeQL](https://github.com/WeaversMask/argus-oss/security/code-scanning),
[secret scanning with push protection](https://docs.github.com/code-security/secret-scanning/introduction/about-secret-scanning),
and [Dependabot alerts](https://github.com/WeaversMask/argus-oss/security/dependabot);
gitleaks scans at commit, at push, and over full history in CI.

## What Belongs Where

- **A secret accidentally committed to this repo** — operational incident,
  not a vulnerability report: follow
  [docs/SECURITY-NOTES.md](https://github.com/WeaversMask/argus-oss/blob/main/docs/SECURITY-NOTES.md) §"If You Accidentally
  Commit a Secret".
- **Supply-chain posture** (dependency pinning, 3-day minimum release age,
  install-script blocking, SHA-pinned CI actions, verified binary
  downloads) — documented in
  [ADR-0003](https://github.com/WeaversMask/argus-oss/blob/main/docs/adr/0003-supply-chain-hardening-baseline.md)
  and
  [docs/SECURITY-NOTES.md](https://github.com/WeaversMask/argus-oss/blob/main/docs/SECURITY-NOTES.md) §"Defences in Place".
- **Vulnerabilities in the external engines Argus orchestrates**
  (TruffleHog, Semgrep, osv-scanner) — report to those projects. Reports
  about how Argus _invokes or sandboxes_ them belong here.
