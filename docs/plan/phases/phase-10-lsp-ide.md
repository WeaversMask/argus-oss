# Phase 10 — LSP + VS Code Extension

> **Self-contained phase doc.** When done, set Current Phase to P11 and load [`phase-11-hardening.md`](./phase-11-hardening.md).

**Duration:** ~2 weeks
**Demoable:** ✅ IDE demo — type invalid code, see squiggly underline within 500ms, hover for explanation, apply quick fix.
**Prerequisites:** Phase 9 complete

---

## Goal

Real-time IDE feedback while typing. A single LSP server serves VS Code, JetBrains (via LSP plugin), Neovim, and any other LSP-compatible editor.

---

## Required Reading Before Starting

- [`../01-repo-structure.md`](../01-repo-structure.md) — `apps/lsp` and `apps/vscode-extension` layout
- Phase 2 auto-fix engine (the same engine powers LSP code actions)

---

## Tasks

### [P10-01] LSP server scaffolding
- **Deps:** P9 complete
- **Outputs:** `apps/lsp/`, implements `vscode-languageserver`
- **Acceptance:** Server starts, responds to `initialize` request, handles graceful shutdown
- **Effort:** M

### [P10-02] On-change diagnostics
- **Deps:** P10-01
- **Outputs:** Incremental analysis on file save (or debounced on type)
- **Acceptance:** <500ms diagnostic latency on typical file (1000 lines)
- **Effort:** L

### [P10-03] Code actions (quick fixes)
- **Deps:** P10-01
- **Outputs:** LSP code action provider for auto-fixable violations
- **Acceptance:** Quick fix appears in lightbulb menu; applying it edits the file via LSP `WorkspaceEdit`
- **Effort:** M

### [P10-04] Hover documentation
- **Deps:** P10-01
- **Outputs:** Rule explanation appears on hover over a violation
- **Acceptance:** Hover content includes rule ID, severity, message, and link to docs
- **Effort:** S

### [P10-05] VS Code extension packaging
- **Deps:** P10-01 through P10-04
- **Outputs:** Published to VS Code Marketplace
- **Acceptance:** One-click install; configuration via VS Code settings UI
- **Effort:** M

---

## Phase 10 Exit Criteria

- [ ] IDE demo recorded
- [ ] Extension published to VS Code Marketplace
- [ ] LSP server documented for non-VS Code editors (Neovim setup example, JetBrains setup example)
- [ ] Phase handover documents debounce strategy and performance budget

---

## Phase-Specific Notes

- **Incremental analysis is critical.** Re-running the full scan on every keystroke is too slow. Cache AST per file, invalidate on change, only re-evaluate rules for changed nodes.
- **Debounce on type, immediate on save.** 300ms debounce on typing; 0ms on save. Configurable per-user.
- **LSP `WorkspaceEdit` for fixes** is preferable to opening a buffer and re-saving. Cleaner UX; editor handles undo correctly.
- **Don't run delegated tools (Semgrep, jscpd) in LSP mode.** Too slow. Only the in-process rules and layer checks. Full scans run on save or on demand via command palette.
- **JetBrains support** comes free via their LSP plugin — but only if the LSP server is a stable binary. Ship as a Node.js script + bundled `node` binary in the extension.

---

## Definition of Done for Phase 10

The next agent can:
1. Install the VS Code extension and see real-time diagnostics
2. Use quick fixes for auto-fixable violations
3. Hover for rule documentation
4. Start Phase 11 (Hardening) with full developer experience in place
