// Renders the THIRD-PARTY-NOTICES document from the facts ./installed-packages.mjs
// reads off the tree. ADR-0002 §F: copyright notices are preserved for every
// license, permissive included.
//
// The CLI entry point is ../generate-third-party-notices.mjs (`pnpm notices`,
// `pnpm notices:check`). Both modes call buildNotices() — writing and checking
// must never be able to disagree about what the file should contain.
//
// ── Two hosts, one file ───────────────────────────────────────────────────
// The maintainer regenerates on darwin-arm64; CI checks on linux-x64. Two
// things used to make the output differ between them, and a drift check is
// worthless unless both are dealt with:
//
//   1. The old header carried a generation date and the host's platform
//      string. Both are provenance about the machine, not about the tree, so
//      they now go to stderr — `git log -- THIRD-PARTY-NOTICES` is the
//      authoritative record of when the committed content last changed, and
//      unlike a self-reported date it cannot be refreshed by a no-op rerun.
//   2. Packages that declare `os`/`cpu`/`libc` constraints (per-platform
//      binaries like lightningcss-<platform>, plus single-OS packages like
//      fsevents) resolve to a different set on every host. Dropping them
//      would violate ADR-0002 §F — fsevents carries a copyright line that
//      appears nowhere else in the tree — so they are inventoried in their
//      own trailing section instead, below DRIFT_CHECK_BOUNDARY. Everything
//      above that line is a pure function of the dependency tree; that is the
//      part --check compares, and the file says so in its own header.
//
// So --check verifies every portable package's presence, version, license
// grouping and copyright text, and cannot verify the host-dependent tail.
// The tail cannot leak into the compared prefix: no platform-constrained
// package in this lockfile declares dependencies of its own, so the portable
// set does not fan out per host (re-verify that if one ever does).

import process from "node:process";

import { formatPackage, pnpmVersion, readInventory } from "./installed-packages.mjs";

export { outputPath } from "./installed-packages.mjs";

// Split point between the host-independent inventory and the host-dependent
// tail. --check compares everything before this string and refuses to run if
// it is absent from either side (fail-closed: a hand-edited or stale file
// must not read as "nothing to compare, therefore clean").
export const DRIFT_CHECK_BOUNDARY =
  "PLATFORM-SPECIFIC PACKAGES — HOST-DEPENDENT, NOT DRIFT-CHECKED";

const HR = "=".repeat(80);
const hr = "-".repeat(80);

/** Everything before the host-dependent tail, or undefined if the marker is absent. */
export function portablePrefix(text) {
  const index = text.indexOf(DRIFT_CHECK_BOUNDARY);
  return index < 0 ? undefined : text.slice(0, index);
}

function header(totalPackages, licenseCount, platformCount) {
  return [
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
    `Inventory: ${totalPackages} packages under ${licenseCount} licenses, plus`,
    `${platformCount} platform-specific package(s) listed at the end of this file.`,
    "",
    "This file records no generation date and no host: everything above the",
    "PLATFORM-SPECIFIC heading is a pure function of the dependency tree, which",
    "is what lets CI verify it (`pnpm notices:check`, the license job). For when",
    "it was last regenerated, use  git log -1 -- THIRD-PARTY-NOTICES.",
    "",
  ];
}

function mplExceptionBlock(portableMpl) {
  if (portableMpl.length === 0) return [];
  return [
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
    "this generator fails on MPL-2.0 packages outside the exception list,",
    "platform-specific builds of an exception package included (those are",
    "listed at the end of this file rather than here).",
    "",
    ...portableMpl.map((pkg) => `    ${pkg.name} ${[...pkg.versions].sort().join(", ")}`),
    "",
  ];
}

function licenseSections(groups, licenseIds) {
  const out = [];
  for (const licenseId of licenseIds) {
    const pkgs = [...groups[licenseId]].sort((a, b) => a.name.localeCompare(b.name));
    out.push(HR, `${licenseId} — ${pkgs.length} package${pkgs.length === 1 ? "" : "s"}`, HR, "");
    for (const pkg of pkgs) out.push(formatPackage(pkg), "");
  }
  return out;
}

function platformSection(platformScoped) {
  const out = [
    HR,
    DRIFT_CHECK_BOUNDARY,
    HR,
    "",
    "The packages below declare `os` / `cpu` / `libc` constraints, so npm",
    "resolves a different set of them on every machine — a per-platform binary",
    "such as lightningcss-<platform>, or a package restricted to one OS such as",
    "fsevents. This section therefore reflects whichever variants the host that",
    "last regenerated this file installed, and no check can compare it across",
    "platforms; `pnpm notices:check` stops at this heading. Their notices are",
    "preserved here rather than dropped, because ADR-0002 §F drops none.",
    "",
  ];
  if (platformScoped.length === 0) {
    out.push("(none installed on the host that generated this file)", "");
    return out;
  }
  for (const pkg of platformScoped) {
    out.push(formatPackage(pkg, ` — ${pkg.licenseId} (${pkg.constraints})`), "");
  }
  return out;
}

/** The whole document, plus the two lines of provenance that stay out of it. */
export function buildNotices() {
  const { groups, licenseIds, platformScoped, totalPackages, portableMpl } = readInventory();

  const out = [
    ...header(totalPackages, licenseIds.length, platformScoped.length),
    ...mplExceptionBlock(portableMpl),
    ...licenseSections(groups, licenseIds),
    ...platformSection(platformScoped),
  ];

  return {
    text: out.join("\n").trimEnd() + "\n",
    counts:
      `${totalPackages} packages, ${licenseIds.length} licenses, ` +
      `${platformScoped.length} platform-specific`,
    // Provenance is returned, never embedded: it describes this run, not the
    // dependency tree, and a header line that changes on every run is exactly
    // what made a drift check impossible before.
    provenance:
      `${new Date().toISOString().slice(0, 10)} · pnpm ${pnpmVersion()} · ` +
      `${process.platform}-${process.arch}`,
  };
}
