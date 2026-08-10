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

**Never put vulnerability details in a public issue.** Use GitHub's private
vulnerability reporting, which is enabled on this repository:

**→ [Report a vulnerability privately](https://github.com/WeaversMask/argus-oss/security/advisories/new)**

Equivalently: the repository's **Security** tab → _Report a vulnerability_.
Reports go privately to the maintainer and are not publicly visible.

If that form is unavailable to you, open a public issue that asks for a
private channel and **contains nothing about the vulnerability itself** — no
description, no reproduction, no affected version. That is a request for
contact, not a report, which is why it is not covered by the line above.
Both routes need a GitHub account; there is no email fallback, because the
maintainer's public address is a `noreply` one that cannot receive mail.

- Best-effort acknowledgment within **7 days** — usually much faster,
  occasionally slower; there is no paid on-call behind this repo.
- Coordinated disclosure: please allow a reasonable window for a fix to land
  before publishing details. Credit is given in the advisory unless you
  prefer otherwise.
- No bug bounty is offered.

So you know what is already watched before you spend time on a report: this
repository runs CodeQL analysis and GitHub secret scanning with push
protection, takes Dependabot alerts and automated security updates, and runs
gitleaks three times over — as a local hook when a commit is made, again on
the outgoing range when it is pushed, and across full history in CI. The
layers and what each is for are written up in
[docs/SECURITY-NOTES.md](https://github.com/WeaversMask/argus-oss/blob/main/docs/SECURITY-NOTES.md)
§"Defences in Place". Published advisories, once any exist, appear under
[Security → Advisories](https://github.com/WeaversMask/argus-oss/security/advisories).

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
