// Reads the installed dependency tree via `pnpm licenses list --json` and
// turns it into the facts THIRD-PARTY-NOTICES is rendered from. Everything
// that touches pnpm or node_modules lives here; ./third-party-notices.mjs
// decides what the document says about it.
//
// Dependency-free by design: it must run before any license tooling exists
// (license-checker arrives with the P0-12 gate; this needs only pnpm).

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";

export const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const outputPath = join(repoRoot, "THIRD-PARTY-NOTICES");

// Packages covered by the ADR-0002 §G named MPL-2.0 exception (dev-only
// transitives, reviewed by the maintainer). Any other MPL-2.0 package must
// trip review — this generator refuses to bless it silently.
// Keep in sync with NAMED_EXCEPTIONS in check-licenses.mjs (the P0-12 gate).
const MPL_EXCEPTION = /^lightningcss(-.+)?$/;

const LICENSE_FILE = /^(licen[cs]e|copying|notice)([-.].*)?$/i;

// npm manifest fields that make a package's installation host-dependent.
const PLATFORM_FIELDS = ["os", "cpu", "libc"];

function pnpm(args) {
  return execFileSync("pnpm", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  }).trim();
}

/** The pnpm that resolved this tree — provenance for the run, never for the file. */
export function pnpmVersion() {
  return pnpm(["--version"]);
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

// The package's own declared install constraints, read from its manifest —
// structural, not a guess from the name (`@turbo/linux-64` and `fsevents`
// share nothing lexically). Returns e.g. "os: darwin · cpu: arm64", or
// undefined for a package that installs everywhere.
function platformConstraints(pkg) {
  for (const dir of pkg.paths ?? []) {
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    } catch {
      continue;
    }
    const declared = PLATFORM_FIELDS.filter(
      (field) => Array.isArray(manifest[field]) && manifest[field].length > 0,
    ).map((field) => `${field}: ${manifest[field].join(", ")}`);
    if (declared.length > 0) return declared.join(" · ");
  }
  return undefined;
}

/** One package's block: name, versions, copyright lines (or author, or an explicit absence), homepage. */
export function formatPackage(pkg, headerSuffix = "") {
  const versions = [...pkg.versions].sort().join(", ");
  const block = [`${pkg.name} ${versions}${headerSuffix}`];
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

// Match compound license expressions too ("MIT OR MPL-2.0") — the interim
// guard stays fail-closed until P0-12's SPDX-aware gate takes over. Runs over
// the full set, before the platform split, so an MPL-2.0 platform binary
// cannot slip through by landing in the un-drift-checked tail.
function assertNoUnreviewedMpl(mplPackages) {
  const unexpected = mplPackages.filter((pkg) => !MPL_EXCEPTION.test(pkg.name));
  if (unexpected.length === 0) return;
  console.error(
    `MPL-2.0 package(s) outside the ADR-0002 §G named exception: ` +
      `${unexpected.map((pkg) => pkg.name).join(", ")}.\n` +
      `New MPL-2.0 dependencies need maintainer review (and an update to the ` +
      `named-exception list in scripts/lib/installed-packages.mjs) ` +
      `before they can be inventoried.`,
  );
  process.exit(1);
}

// Move host-dependent packages out of the per-license inventory. Every count
// the document shows above the drift-check boundary is then computed from the
// portable set alone, so it does not shift with the host either.
// Mutates `groups`; returns the extracted packages, name-sorted.
function extractPlatformScoped(groups) {
  const platformScoped = [];
  for (const [licenseId, pkgs] of Object.entries(groups)) {
    const portable = [];
    for (const pkg of pkgs) {
      const constraints = platformConstraints(pkg);
      if (constraints) platformScoped.push({ ...pkg, licenseId, constraints });
      else portable.push(pkg);
    }
    if (portable.length === 0) delete groups[licenseId];
    else groups[licenseId] = portable;
  }
  return platformScoped.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Third-party packages in the installed tree, split into the host-independent
 * inventory (`groups`, keyed by license id) and the host-dependent
 * `platformScoped` tail. Exits the process on an unreviewed MPL-2.0 package.
 */
export function readInventory() {
  const groups = JSON.parse(pnpm(["licenses", "list", "--json"]));

  // Workspace packages are first-party, not third-party — drop them.
  for (const [licenseId, pkgs] of Object.entries(groups)) {
    groups[licenseId] = pkgs.filter((pkg) => !pkg.name.startsWith("@argus/"));
    if (groups[licenseId].length === 0) delete groups[licenseId];
  }

  const mplPackages = Object.entries(groups)
    .filter(([licenseId]) => /\bMPL-2\.0\b/i.test(licenseId))
    .flatMap(([, pkgs]) => pkgs);
  assertNoUnreviewedMpl(mplPackages);

  const platformScoped = extractPlatformScoped(groups);
  const licenseIds = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  return {
    groups,
    licenseIds,
    platformScoped,
    totalPackages: licenseIds.reduce((n, id) => n + groups[id].length, 0),
    // MPL packages still inside the drift-checked inventory — the named
    // exception block lists these; platform builds are named in the tail.
    portableMpl: mplPackages.filter((pkg) => !platformScoped.some((p) => p.name === pkg.name)),
  };
}
