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

Use GitHub's private vulnerability reporting for this repository:
**Security → Report a vulnerability** (or `/security/advisories/new`).
Reports go privately to the maintainer.

- Best-effort acknowledgment within **7 days** — usually much faster,
  occasionally slower; there is no paid on-call behind this repo.
- Coordinated disclosure: please allow a reasonable window for a fix to land
  before publishing details. Credit is given in the advisory unless you
  prefer otherwise.
- No bug bounty is offered.

> Maintainer setup note: private vulnerability reporting is a one-time
> repo-settings toggle (Settings → Advanced Security). Same pending admin
> bucket as branch-protection required checks (open since P0-03).

## What Belongs Where

- **A secret accidentally committed to this repo** — operational incident,
  not a vulnerability report: follow
  [docs/SECURITY-NOTES.md](docs/SECURITY-NOTES.md) §"If You Accidentally
  Commit a Secret".
- **Supply-chain posture** (dependency pinning, 3-day minimum release age,
  install-script blocking, SHA-pinned CI actions, verified binary
  downloads) — documented in
  [ADR-0003](docs/adr/0003-supply-chain-hardening-baseline.md) and
  [docs/SECURITY-NOTES.md](docs/SECURITY-NOTES.md) §"Defences in Place".
- **Vulnerabilities in the external engines Argus orchestrates**
  (TruffleHog, Semgrep, osv-scanner) — report to those projects. Reports
  about how Argus _invokes or sandboxes_ them belong here.
