#!/usr/bin/env node
// Handover rotation (agentic-execution.md §Handover Rotation).
//
// `docs/HANDOVER.md` is authored at `docs/`, so every relative link in it is
// written relative to `docs/`. Rotation copies it one level deeper into
// `docs/handovers/`, where those paths no longer resolve — `./plan/…` becomes
// `docs/handovers/plan/…`, `../.github/…` becomes `docs/.github/…`. Copying by
// hand therefore rots every link in the snapshot on arrival, silently, because
// nobody clicks links in an archive. The Phase 2 documentation audit measured
// the accumulated damage at 100 broken links across 36 snapshots — one cause,
// invisible for months (docs/audits/phase-02-doc-audit.md, Finding 5).
//
// This script is the fix for both halves: `rotate` re-resolves as it copies, so
// the rot cannot be re-introduced, and `--repair` re-resolves the snapshots that
// were already copied by hand. Both verify before exiting and both fail closed.
//
//   pnpm handover:rotate <slug>   copy docs/HANDOVER.md -> docs/handovers/<slug>-handover.md
//   pnpm handover:rotate --repair re-resolve broken links across every snapshot
//   pnpm handover:check           verify only; changes nothing
//
// The verifier is the same check the per-phase documentation audit runs
// (docs/plan/templates/PHASE-DOC-AUDIT.template.md §6), narrowed to the archive.

import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = resolve(REPO_ROOT, "docs");
const ARCHIVE_DIR = resolve(DOCS_DIR, "handovers");
const SOURCE = resolve(DOCS_DIR, "HANDOVER.md");

// Markdown inline links: [text](target). Matched in three groups so the target
// can be replaced without disturbing the label.
const LINK = /(\[[^\]]*\]\()([^)\s]+)(\))/g;

/** Opening or closing fence of a code block: ``` or ~~~, optional info string. */
const FENCE = /^\s{0,3}(?:```|~~~)/;

// Deliberately identical to the audit template's oracle, so the two agree on
// which links are in scope. Anything with a scheme, or a bare fragment, is not
// a path this script can re-resolve.
const isExternal = (href) => /^(https?:|mailto:|#)/.test(href);

/**
 * Walk `markdown` a line at a time, passing only prose lines to `transform`
 * and returning the reassembled document.
 *
 * A fenced block is sample text, not navigation: `docs/HANDOVER.md` routinely
 * carries a "Files Touched" block, and a shell or markdown example inside one
 * could well contain something shaped like a link. Rewriting that would edit an
 * example rather than fix a path. No archived handover contains such a case
 * today — checked — so this guards a future one.
 *
 * Not detected, and deliberately: inline code spans, and code blocks indented
 * by four spaces (indistinguishable, line by line, from a wrapped list item).
 * Both are far rarer in these documents than fenced blocks, and neither has
 * ever occurred; a link in one would still be rewritten.
 */
function mapProseLines(markdown, transform) {
  let inFence = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (FENCE.test(line)) {
        inFence = !inFence;
        return line;
      }
      return inFence ? line : transform(line);
    })
    .join("\n");
}

/** Split a link target into its path and its `#fragment` (either may be empty). */
function splitFragment(href) {
  const hash = href.indexOf("#");
  return hash === -1 ? [href, ""] : [href.slice(0, hash), href.slice(hash)];
}

/** Does a link target resolve to something on disk, read from `fromDir`? */
function resolves(href, fromDir) {
  const [path] = splitFragment(href);
  if (!path) return true; // pure fragment — nothing to resolve
  return existsSync(resolve(fromDir, decodeURI(path)));
}

/**
 * Rewrite a link authored relative to `fromDir` so it means the same thing when
 * read from `toDir`. Pure path arithmetic: the target is never decoded, so any
 * percent-encoding in the original survives untouched.
 */
function retarget(href, fromDir, toDir) {
  const [path, fragment] = splitFragment(href);
  if (!path) return href;

  let rel = relative(toDir, resolve(fromDir, path)).split(sep).join("/");
  if (rel === "") rel = ".";
  if (!rel.startsWith(".")) rel = `./${rel}`;
  if (path.endsWith("/") && !rel.endsWith("/")) rel += "/";
  return rel + fragment;
}

/**
 * Re-resolve every relative link in `markdown` from `fromDir` to `toDir`.
 *
 * `onlyBroken` is the difference between the two modes. Rotating a fresh copy of
 * `HANDOVER.md` is unconditional: every relative link in it is known to be
 * docs-relative, so every one of them needs moving. Repairing the existing
 * archive is conditional, because that directory is mixed — DOC-04's snapshot
 * was corrected by hand and is already right, and rewriting a correct link
 * would push it one level too far. Conditional repair is also idempotent.
 */
function reresolveLinks(markdown, { fromDir, toDir, onlyBroken }) {
  let rewritten = 0;
  const out = mapProseLines(markdown, (line) =>
    line.replace(LINK, (whole, open, href, close) => {
      if (isExternal(href)) return whole;
      if (onlyBroken && resolves(href, toDir)) return whole;
      const next = retarget(href, fromDir, toDir);
      if (next === href) return whole;
      rewritten += 1;
      return open + next + close;
    }),
  );
  return { out, rewritten };
}

/** Report every relative link under `docs/handovers/` that does not resolve. */
function verifyArchive() {
  const broken = [];
  for (const file of archiveFiles()) {
    const abs = resolve(ARCHIVE_DIR, file);
    mapProseLines(readFileSync(abs, "utf8"), (line) => {
      for (const [, , href] of line.matchAll(LINK)) {
        if (isExternal(href)) continue;
        if (!resolves(href, ARCHIVE_DIR)) broken.push([file, href]);
      }
      return line;
    });
  }
  return broken;
}

function archiveFiles() {
  return readdirSync(ARCHIVE_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

function die(message) {
  console.error(`rotate-handover: ${message}`);
  process.exit(1);
}

function report(label) {
  const broken = verifyArchive();
  if (broken.length > 0) {
    for (const [file, href] of broken) console.error(`BROKEN handovers/${file} -> ${href}`);
    die(`${broken.length} link(s) in docs/handovers/ do not resolve`);
  }
  console.log(`${label}: all relative links in docs/handovers/ resolve`);
}

// ── Modes ──────────────────────────────────────────────────────────────────
const [mode] = process.argv.slice(2);

if (mode === "--check") {
  report("OK");
} else if (mode === "--repair") {
  let files = 0;
  let links = 0;
  for (const file of archiveFiles()) {
    const abs = resolve(ARCHIVE_DIR, file);
    const { out, rewritten } = reresolveLinks(readFileSync(abs, "utf8"), {
      fromDir: DOCS_DIR,
      toDir: ARCHIVE_DIR,
      onlyBroken: true,
    });
    if (rewritten === 0) continue;
    writeFileSync(abs, out);
    console.log(`  ${file}: ${rewritten} link(s) re-resolved`);
    files += 1;
    links += rewritten;
  }
  console.log(`repaired ${links} link(s) across ${files} snapshot(s)`);
  report("OK");
} else if (mode && !mode.startsWith("-")) {
  const dest = resolve(ARCHIVE_DIR, `${mode.replace(/-handover$/, "")}-handover.md`);
  if (!existsSync(SOURCE)) die(`${relative(REPO_ROOT, SOURCE)} does not exist`);
  if (existsSync(dest)) die(`${relative(REPO_ROOT, dest)} already exists — refusing to overwrite`);

  copyFileSync(SOURCE, dest);
  const { out, rewritten } = reresolveLinks(readFileSync(dest, "utf8"), {
    fromDir: DOCS_DIR,
    toDir: ARCHIVE_DIR,
    onlyBroken: false,
  });
  writeFileSync(dest, out);
  console.log(`rotated -> ${relative(REPO_ROOT, dest)} (${rewritten} link(s) re-resolved)`);
  report("OK");
} else {
  die("usage: rotate-handover.mjs <slug> | --repair | --check");
}
