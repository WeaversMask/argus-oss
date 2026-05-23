# Phase 7 — Web UI

> **Self-contained phase doc.** When done, set Current Phase to P8 and load [`phase-08-reporting.md`](./phase-08-reporting.md).

**Duration:** ~4 weeks
**Demoable:** ✅ Full product demo — connect a repo, configure layers via UI, scan, explore, fix in IDE, re-scan, see trend.
**Prerequisites:** Phase 6 complete

---

## Goal

The full product experience: dashboard, violations explorer, architecture visualiser, file drilldown, rule management, visual config editor, trend dashboard, and user/access management.

---

## Required Reading Before Starting

- [`../01-repo-structure.md`](../01-repo-structure.md) — `apps/web` and `packages/ui-components` layout
- The tRPC client interface from Phase 6 (auto-generated, but skim its surface)

---

## Tasks

### [P7-01] React app shell + auth flow
- **Deps:** P6 complete
- **Outputs:** `apps/web/`, routing (React Router or TanStack Router), login page, protected routes
- **Acceptance:** Cold-start to logged-in dashboard in under 3 seconds on a typical broadband connection
- **Effort:** M

### [P7-02] Dashboard page
- **Deps:** P7-01
- **Outputs:** Project scorecard, trend sparklines, top violated rules, most problematic files
- **Effort:** L

### [P7-03] Violations explorer
- **Deps:** P7-01
- **Outputs:** Faceted filter table, full-text search, inline code preview with violation highlighting, rule explanation panel, bulk actions
- **Effort:** XL

### [P7-04] Architecture visualiser (React Flow)
- **Deps:** P7-01, P3 (layer data via API)
- **Outputs:** Interactive dependency graph with violated-edge highlighting, layer summary view toggle, cycle highlight, SVG/PNG export
- **Effort:** XL

### [P7-05] File drilldown
- **Deps:** P7-01
- **Outputs:** File browser tree, source viewer with inline violations, complexity heatmap overlay, duplication-block jump links
- **Effort:** L

### [P7-06] Rule management UI
- **Deps:** P7-01
- **Outputs:** Rule catalogue browser, enable/disable toggles, severity adjustment, threshold tuning, rule playground (Monaco editor + live evaluation)
- **Effort:** L

### [P7-07] Visual config editor
- **Deps:** P7-01
- **Outputs:** YAML form editor, layer manifest builder with drag-and-drop, raw-YAML toggle, validation feedback inline, config diff view
- **Effort:** XL

### [P7-08] User & access management UI
- **Deps:** P6-06, P7-01
- **Outputs:** User list, role assignment, API key management, audit log viewer, SSO config
- **Effort:** M

---

## Phase 7 Exit Criteria

- [ ] End-to-end demo recorded
- [ ] Lighthouse score ≥90 on all main pages
- [ ] All pages keyboard-navigable; WCAG AA compliance verified
- [ ] Phase handover documents component library, styling conventions, and known performance hot spots

---

## Phase-Specific Notes

- **State management is intentionally lightweight.** Zustand for app state, TanStack Query for server state. Don't reach for Redux.
- **The architecture visualiser is the most complex view.** React Flow handles layout but very large graphs (>500 nodes) need virtualisation. Build a layer-only summary view first; full graph as a second tier.
- **Monaco editor in the rule playground** is heavyweight. Lazy-load it; don't ship it in the main bundle.
- **The visual config editor must round-trip.** Loading YAML → editing in the form → exporting YAML must produce the same file (modulo whitespace). Use a lossless YAML library (`yaml` package, not `js-yaml`) to preserve comments.
- **Accessibility is part of done.** Every interactive component has keyboard navigation, focus management, and ARIA labels. Audit with `axe-core` in CI.

---

## Definition of Done for Phase 7

The next agent can:
1. Open the UI and navigate every view
2. Configure a project entirely through the UI (no manual YAML)
3. See real-time updates as scans progress
4. Start Phase 8 (Reporting UI) with the component library ready to reuse
