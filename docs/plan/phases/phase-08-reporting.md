# Phase 8 — Reporting Engine

> **Self-contained phase doc.** When done, set Current Phase to P9 and load [`phase-09-ci-integrations.md`](./phase-09-ci-integrations.md).

**Duration:** ~3 weeks
**Demoable:** ✅ PDF/DOCX export — every report type renders in every format.
**Prerequisites:** Phase 7 complete

---

## Goal

All seven output formats (PDF, DOCX, HTML, CSV/Excel, JSON, SARIF, Markdown) and all six report types (Scan Summary, Architecture Conformance, Security Audit, Trend, Compliance, Full Violation).

---

## Required Reading Before Starting

- [`../01-repo-structure.md`](../01-repo-structure.md) — `packages/reports` layout
- The conformance scoring and trend calculator services from earlier phases

---

## Tasks

### [P8-01] Report builder ports

- **Deps:** P7 complete
- **Outputs:** Format-agnostic `Report` domain model in `packages/reports/src/ports/`
- **Acceptance:** A `Report` instance can be passed to any formatter without modification
- **Effort:** S

### [P8-02] Scan Summary report builder

- **Deps:** P8-01
- **Outputs:** Builder producing a `Report` from a scan
- **Effort:** M

### [P8-03] Architecture Conformance report builder

- **Deps:** P8-01
- **Outputs:** Includes embedded layer diagram (SVG)
- **Effort:** L

### [P8-04] Security Audit report builder (OWASP-mapped)

- **Deps:** P8-01
- **Outputs:** Findings grouped by OWASP Top 10 category
- **Effort:** M

### [P8-05] Trend report builder

- **Deps:** P8-01, P5-04
- **Outputs:** Time-series charts as embedded images
- **Effort:** M

### [P8-06] Compliance report builder

- **Deps:** P8-01
- **Outputs:** Suppression log appendix, configuration history, sign-off fields
- **Effort:** M

### [P8-07] PDF formatter (Puppeteer)

- **Deps:** P8-02
- **Acceptance:** Renders A4 and Letter sizes correctly; page numbers and TOC
- **Effort:** M

### [P8-08] DOCX formatter

- **Deps:** P8-02
- **Acceptance:** Editable in Word, LibreOffice, and Google Docs; styles applied; tables and embedded images render
- **Effort:** M

### [P8-09] HTML formatter (self-contained)

- **Deps:** P8-02
- **Acceptance:** Single-file output with embedded charts; renders offline
- **Effort:** M

### [P8-10] CSV / Excel formatter

- **Deps:** P8-02
- **Acceptance:** Excel output uses native charts, not embedded images
- **Effort:** S

### [P8-11] JSON formatter

- **Deps:** P8-02
- **Acceptance:** Validates against schema in `@argus/api-contracts`
- **Effort:** S

### [P8-12] SARIF formatter

- **Deps:** P8-02
- **Acceptance:** Validates against official SARIF 2.1.0 schema; opens in VS Code SARIF viewer
- **Effort:** M

### [P8-13] Markdown formatter

- **Deps:** P8-02
- **Effort:** S

### [P8-14] Report Builder UI

- **Deps:** P8-07 through P8-13, P7 complete
- **Outputs:** UI for selecting type, format, sections, filters, branding (logo, header/footer)
- **Effort:** L

### [P8-15] Scheduled report generation

- **Deps:** P8-14, P6-03
- **Outputs:** Cron-based scheduled reports, email/webhook delivery
- **Effort:** M

---

## Phase 8 Exit Criteria

- [ ] Every report type renders in every format
- [ ] Branded PDFs render with logo and custom header
- [ ] SARIF output passes official schema validation
- [ ] Phase handover documents the formatter contract and how to add a new format

---

## Phase-Specific Notes

- **Puppeteer is heavyweight.** Run it as a singleton browser pool; spinning up Chromium per report is too slow. Consider a separate worker process if memory becomes an issue.
- **DOCX library quirks:** the `docx` npm package has subtle XML schema requirements. Always validate output with `validate.py` (see the docx skill) before declaring a feature complete.
- **Branding is per-organisation.** Logo URLs, header/footer text, and colour overrides come from project config. Don't hard-code anything.
- **SARIF version pinning:** stick to 2.1.0. The schema is stable and widely consumed by GitHub, GitLab, and IDEs.
- **Excel formatter should use real cells and formulas where possible.** A flat dump of violations is usable; a workbook with a pivot-table-ready sheet is delightful.

---

## Definition of Done for Phase 8

The next agent can:

1. Generate any report type in any format via UI or API
2. Schedule a weekly compliance report delivered to email
3. Brand reports with org logo
4. Start Phase 9 with full reporting in place
