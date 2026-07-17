#!/usr/bin/env node
// License-compliance gate (ADR-0002 §G): every third-party package resolved
// into the tree must carry a license on the SPDX allowlist below, or be a
// named, maintainer-reviewed exception. Run locally as `pnpm license-check`;
// CI runs it as the `license` job. Dev-tooling self-audit only — distinct
// from the planned P4-06 license-checker *product adapter*; P11-02's
// comprehensive audit may later supersede it.
//
// License determinations come from `license-checker` (locked P0-10 decision):
// its read-installed traversal cannot follow pnpm's symlinked virtual store
// past direct dependencies (verified empirically: 16 of 333 packages from the
// repo root), so this script enumerates every physical package directory in
// node_modules/.pnpm and runs license-checker per directory, unioning the
// per-package records (including bundledDependencies nested inside a package
// — those never get .pnpm entries of their own). Policy evaluation happens
// here, fail-closed: unknown
// ids, UNLICENSED/UNKNOWN, custom license text, and SPDX `WITH` clauses all
// trip the gate for manual review.

import { createRequire } from "node:module";
import { existsSync, lstatSync, readdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import process from "node:process";
import console from "node:console";

const require = createRequire(import.meta.url);
const checker = require("license-checker");

// ── Policy (verbatim from ADR-0002 §G — changes need maintainer review) ────
const ALLOWLIST = new Set([
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "Unlicense",
  "CC0-1.0",
  "BlueOak-1.0.0",
  "Python-2.0",
]);

// Named, maintainer-reviewed exceptions. An exception applies only while the
// package's license string is exactly what was reviewed — any change (new
// license, new MPL-2.0 package, …) trips the gate again.
const NAMED_EXCEPTIONS = [
  {
    // ADR-0002 §G: dev-only transitives, weak file-level copyleft, unmodified,
    // not redistributed; notices preserved in THIRD-PARTY-NOTICES.
    // Keep in sync with MPL_EXCEPTION in generate-third-party-notices.mjs.
    name: /^lightningcss(-.+)?$/,
    license: "MPL-2.0",
    reason: "ADR-0002 §G named MPL-2.0 exception (lightningcss*)",
  },
  {
    // TODO(licensing:) transitives of the license gate itself (P0-12):
    // SPDX-legal-team data files under attribution-only licenses. Dev-only,
    // data-not-code, not redistributed by Argus.
    name: /^spdx-exceptions$/,
    license: "CC-BY-3.0",
    reason: "license-checker transitive — SPDX exception-id data (P0-12)",
  },
  {
    name: /^spdx-ranges$/,
    license: "(MIT AND CC-BY-3.0)",
    reason: "license-checker transitive — SPDX range data (P0-12)",
  },
  {
    // Stryker transitive (OPS-04c): browser-compat DATA tables, not code
    // (caniuse-lite ← browserslist ← @babel/* ← @stryker-mutator/
    // instrumenter). Attribution-only license, dev-only, unmodified, not
    // redistributed by Argus; attribution preserved in THIRD-PARTY-NOTICES.
    // Same shape as the spdx-* CC-BY data exceptions above (P0-12
    // precedent); maintainer sign-off = merging the OPS-04c PR.
    name: /^caniuse-lite$/,
    license: "CC-BY-4.0",
    reason: "Stryker transitive — browser-compat data (OPS-04c)",
  },
];

// ── SPDX expression evaluation (minimal, fail-closed) ──────────────────────
// Handles what the allowlist needs: bare ids, OR (any side allowed), AND
// (every side allowed), parentheses. Everything else — WITH clauses,
// malformed input, ids off the allowlist — evaluates to "not allowed".
function balanced(s) {
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")" && --depth < 0) return false;
  }
  return depth === 0;
}

function splitTopLevel(s, token) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (depth === 0 && s.startsWith(token, i)) {
      parts.push(s.slice(start, i));
      start = i + token.length;
      i = start - 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

function isAllowed(expr) {
  const s = expr.trim();
  if (s.length === 0) return false;
  if (ALLOWLIST.has(s)) return true;
  if (s.startsWith("(") && s.endsWith(")") && balanced(s.slice(1, -1))) {
    return isAllowed(s.slice(1, -1));
  }
  const or = splitTopLevel(s, " OR ");
  if (or.length > 1) return or.some(isAllowed);
  const and = splitTopLevel(s, " AND ");
  if (and.length > 1) return and.every(isAllowed);
  return false;
}

// ── Enumerate every physical package dir in the pnpm virtual store ─────────
// .pnpm/<name@version[peer-hash]>/node_modules/<name> is the one physical copy
// of each resolved package; everything else in those node_modules is a symlink
// to a sibling entry. Workspace packages (first-party) live outside .pnpm and
// are deliberately not scanned — this gate covers third-party code only.
function physicalPackageDirs(installRoot) {
  const storeDir = join(installRoot, "node_modules", ".pnpm");
  if (!existsSync(storeDir)) {
    throw new Error(
      `no pnpm virtual store at ${storeDir} — run pnpm install first ` +
        `(this gate only understands pnpm installation roots)`,
    );
  }
  const dirs = [];
  const isPhysicalPackage = (p) =>
    !lstatSync(p).isSymbolicLink() && existsSync(join(p, "package.json"));
  for (const entry of readdirSync(storeDir)) {
    const nm = join(storeDir, entry, "node_modules");
    if (!existsSync(nm)) continue;
    for (const child of readdirSync(nm)) {
      const childPath = join(nm, child);
      if (child.startsWith("@")) {
        if (lstatSync(childPath).isSymbolicLink()) continue;
        for (const scoped of readdirSync(childPath)) {
          const scopedPath = join(childPath, scoped);
          if (isPhysicalPackage(scopedPath)) dirs.push(scopedPath);
        }
      } else if (isPhysicalPackage(childPath)) {
        dirs.push(childPath);
      }
    }
  }
  return dirs;
}

const checkerInit = (opts) =>
  new Promise((res, rej) => checker.init(opts, (err, pkgs) => (err ? rej(err) : res(pkgs))));

// license-checker appends "*" when it guessed the license from shipped files
// instead of the package.json field. Evaluate the underlying id (a guessed
// GPL still fails) but surface every guess so reviews see the uncertainty.
//
// Besides the start package itself, keep records for anything license-checker
// found in node_modules nested *inside* the start dir: bundledDependencies
// ship that way and never get .pnpm entries of their own, so dropping those
// records would silently exempt bundled packages from the gate. Symlinked
// sibling deps resolve outside the start dir and are skipped here — each is
// scanned as its own physical dir.
async function licenseRecords(dir) {
  const pkgs = await checkerInit({ start: dir });
  const records = [];
  let sawStartDir = false;
  for (const [id, info] of Object.entries(pkgs)) {
    if (info.path === dir) sawStartDir = true;
    else if (!info.path.startsWith(dir + sep)) continue;
    const raw = Array.isArray(info.licenses) ? info.licenses.join(" OR ") : String(info.licenses);
    const guessed = raw.endsWith("*");
    records.push({ id, name: id.slice(0, id.lastIndexOf("@")), raw, guessed });
  }
  if (!sawStartDir) {
    throw new Error(`license-checker returned no record for its start dir ${dir}`);
  }
  return records;
}

const installRoot =
  process.argv[2] === "--start" && process.argv[3]
    ? resolve(process.argv[3])
    : resolve(import.meta.dirname, "..");

const records = new Map(); // id -> record (dedupes peer-variant store entries)
for (const dir of physicalPackageDirs(installRoot)) {
  let dirRecords;
  try {
    dirRecords = await licenseRecords(dir);
  } catch (err) {
    // Fail closed with the script's own format instead of a raw stack trace.
    console.error(`license-check ERROR — could not determine licenses under ${dir}:`);
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  for (const record of dirRecords) {
    if (!records.has(record.id)) records.set(record.id, record);
  }
}

const violations = [];
const guessed = [];
const exceptionsUsed = new Map(); // reason -> ids
for (const record of records.values()) {
  if (record.guessed) guessed.push(record);
  const evaluated = record.guessed ? record.raw.slice(0, -1) : record.raw;
  if (isAllowed(evaluated)) continue;
  const exception = NAMED_EXCEPTIONS.find(
    (candidate) => candidate.name.test(record.name) && candidate.license === evaluated,
  );
  if (exception) {
    const ids = exceptionsUsed.get(exception.reason) ?? [];
    ids.push(record.id);
    exceptionsUsed.set(exception.reason, ids);
    continue;
  }
  violations.push(record);
}

for (const record of guessed) {
  console.error(
    `note: license for ${record.id} was guessed from shipped files (${record.raw}) — ` +
      `package.json carries no usable license field`,
  );
}

if (violations.length > 0) {
  console.error(`license-check FAILED — ${violations.length} package(s) outside the allowlist:\n`);
  for (const record of violations.sort((a, b) => a.id.localeCompare(b.id))) {
    console.error(`  ${record.id}  →  ${record.raw}`);
  }
  console.error(
    `\nAllowed: ${[...ALLOWLIST].join(", ")}.\n` +
      `If a package is genuinely needed under another license, it requires\n` +
      `maintainer review and a named exception here (ADR-0002 §G) — do not\n` +
      `widen the allowlist in the same change that adds the dependency.`,
  );
  process.exit(1);
}

const summary = [...exceptionsUsed.entries()]
  .map(([reason, ids]) => `  exception: ${ids.sort().join(", ")} — ${reason}`)
  .join("\n");
console.log(
  `license-check OK — ${records.size} third-party packages, all on the ADR-0002 §G allowlist` +
    (summary.length > 0 ? `\n${summary}` : ""),
);
