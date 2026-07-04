#!/usr/bin/env node
// Generates THIRD-PARTY-NOTICES from the installed dependency tree via
// `pnpm licenses list --json`. ADR-0002 §F: copyright notices are preserved
// for every license, permissive included. Regenerate whenever the dependency
// tree changes:  pnpm notices
//
// Dependency-free by design: it must run before any license tooling exists
// (license-checker arrives with the P0-12 gate; this needs only pnpm).

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(repoRoot, "THIRD-PARTY-NOTICES");

// Packages covered by the ADR-0002 §G named MPL-2.0 exception (dev-only
// transitives, reviewed by the maintainer). Any other MPL-2.0 package must
// trip review — this generator refuses to bless it silently.
// Keep in sync with NAMED_EXCEPTIONS in check-licenses.mjs (the P0-12 gate).
const MPL_EXCEPTION = /^lightningcss(-.+)?$/;

const LICENSE_FILE = /^(licen[cs]e|copying|notice)([-.].*)?$/i;

const HR = "=".repeat(80);
const hr = "-".repeat(80);

function pnpm(args) {
  return execFileSync("pnpm", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  }).trim();
}

// Pull the copyright line(s) out of a package's shipped license/notice files.
// Filters template placeholders (Apache's "[yyyy]") and legalese lines that
// merely mention the word ("copyright notice and this permission notice").
function copyrightLines(pkgDir) {
  let entries;
  try {
    entries = readdirSync(pkgDir);
  } catch {
    return [];
  }
  const lines = new Set();
  for (const entry of entries.filter((name) => LICENSE_FILE.test(name))) {
    let text;
    try {
      text = readFileSync(join(pkgDir, entry), "utf8");
    } catch {
      continue;
    }
    for (const rawLine of text.split(/\r?\n/)) {
      if (lines.size >= 4) break;
      const line = rawLine.replace(/^[\s#*/>-]+/, "").trim();
      if (!/^(portions\s+)?copyright\b|^©/i.test(line)) continue;
      if (!/\d{4}|\(c\)|©/i.test(line)) continue;
      if (/\[yyyy\]|\[name of copyright owner\]/i.test(line)) continue;
      if (line.length > 180) continue;
      lines.add(line);
    }
  }
  return [...lines];
}

function formatPackage(pkg) {
  const versions = [...pkg.versions].sort().join(", ");
  const block = [`${pkg.name} ${versions}`];
  // Merge across all resolved versions — notice text can differ between them.
  const notices = [...new Set((pkg.paths ?? []).flatMap((dir) => copyrightLines(dir)))];
  if (notices.length > 0) {
    for (const notice of notices) block.push(`  ${notice}`);
  } else if (typeof pkg.author === "string" && pkg.author.length > 0) {
    block.push(`  Author: ${pkg.author}`);
  } else {
    // e.g. verbatim MPL-2.0 text ships with no copyright line at all
    block.push("  (published package carries no copyright line or author field)");
  }
  if (pkg.homepage) block.push(`  ${pkg.homepage}`);
  return block.join("\n");
}

const groups = JSON.parse(pnpm(["licenses", "list", "--json"]));

// Workspace packages are first-party, not third-party — drop them.
for (const [licenseId, pkgs] of Object.entries(groups)) {
  groups[licenseId] = pkgs.filter((pkg) => !pkg.name.startsWith("@argus/"));
  if (groups[licenseId].length === 0) delete groups[licenseId];
}

// Match compound license expressions too ("MIT OR MPL-2.0") — the interim
// guard stays fail-closed until P0-12's SPDX-aware gate takes over.
const mplPackages = Object.entries(groups)
  .filter(([licenseId]) => /\bMPL-2\.0\b/i.test(licenseId))
  .flatMap(([, pkgs]) => pkgs);
const unexpectedMpl = mplPackages.filter((pkg) => !MPL_EXCEPTION.test(pkg.name));
if (unexpectedMpl.length > 0) {
  console.error(
    `MPL-2.0 package(s) outside the ADR-0002 §G named exception: ` +
      `${unexpectedMpl.map((pkg) => pkg.name).join(", ")}.\n` +
      `New MPL-2.0 dependencies need maintainer review (and an update to the ` +
      `named-exception list in scripts/generate-third-party-notices.mjs) ` +
      `before they can be inventoried.`,
  );
  process.exit(1);
}

const licenseIds = Object.keys(groups).sort((a, b) => a.localeCompare(b));
const totalPackages = licenseIds.reduce((n, id) => n + groups[id].length, 0);
const snapshot = [
  new Date().toISOString().slice(0, 10),
  `pnpm ${pnpm(["--version"])}`,
  `${process.platform}-${process.arch}`,
  `${totalPackages} packages, ${licenseIds.length} licenses`,
].join(" · ");

const out = [];
out.push(
  HR,
  "THIRD-PARTY SOFTWARE NOTICES",
  HR,
  "",
  "Argus is MIT-licensed (see LICENSE). This file inventories the third-party",
  "npm packages resolved by Argus's dependency manifests (package.json,",
  "pnpm-lock.yaml) and preserves their copyright notices, grouped by license.",
  "Notices are preserved for every license, permissive included (ADR-0002 §F).",
  "",
  "GENERATED FILE — do not edit by hand. Regenerate with:  pnpm notices",
  "",
  "Argus ships as source code plus dependency manifests only (ADR-0002 §B):",
  "the packages below are NOT vendored or redistributed in this repository.",
  "They are fetched from the npm registry at install time, and each package",
  "carries its own full license text in its published form.",
  "",
  "The external scanning engines Argus orchestrates (TruffleHog, Semgrep,",
  "osv-scanner) are not npm dependencies and are never distributed with",
  'Argus — users install them separately. See README "External tools /',
  'Prerequisites" and ADR-0002 §A/§B.',
  "",
  `Snapshot: ${snapshot}`,
  "Platform-specific binary packages (e.g. lightningcss-<platform>) vary with",
  "the host that generated this file.",
  "",
);

if (mplPackages.length > 0) {
  out.push(
    hr,
    "NAMED LICENSE EXCEPTION — MPL-2.0 (ADR-0002 §G)",
    hr,
    "",
    "MPL-2.0 is not on the Argus dependency allowlist. The packages below are",
    "a named, maintainer-reviewed exception: dev-only transitive dependencies,",
    "weak file-level copyleft, unmodified, and not redistributed by Argus.",
    "Their notices are preserved in the MPL-2.0 section of this file, and the",
    "source of the MPL-covered files is available from each package's",
    "repository. Any NEW MPL-2.0 dependency must pass maintainer review —",
    "this generator fails on MPL-2.0 packages outside the exception list.",
    "",
    ...mplPackages.map((pkg) => `    ${pkg.name} ${[...pkg.versions].sort().join(", ")}`),
    "",
  );
}

for (const licenseId of licenseIds) {
  const pkgs = [...groups[licenseId]].sort((a, b) => a.name.localeCompare(b.name));
  out.push(HR, `${licenseId} — ${pkgs.length} package${pkgs.length === 1 ? "" : "s"}`, HR, "");
  for (const pkg of pkgs) {
    out.push(formatPackage(pkg), "");
  }
}

writeFileSync(outputPath, out.join("\n").trimEnd() + "\n");
console.error(`Wrote ${outputPath} (${totalPackages} packages, ${licenseIds.length} licenses)`);
