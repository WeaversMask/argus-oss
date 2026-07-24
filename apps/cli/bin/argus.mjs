#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

/**
 * The published `argus` executable.
 *
 * The Argus workspace is buildless — its packages export raw TypeScript with
 * `.js` bundler-resolution specifiers — so this wrapper re-execs Node with the
 * two things that make that runnable (P2-02 runtime decision, maintainer-
 * approved): `--experimental-transform-types` (the domain uses TS parameter
 * properties, which Node's strip-only mode rejects) and a resolve hook that
 * remaps `.js`→`.ts` (loader/register.mjs). The ExperimentalWarning is
 * silenced. The child inherits stdio and its exit code is propagated verbatim,
 * so the CLI's 0/1/2 convention survives the extra hop.
 *
 * Global-install bundling (a self-contained `dist/` with no flags) is a
 * deliberately deferred follow-up (P2-02 handover).
 */
const loaderPath = fileURLToPath(new URL("../loader/register.mjs", import.meta.url));
const entryPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const child = spawnSync(
  process.execPath,
  [
    "--experimental-transform-types",
    "--disable-warning=ExperimentalWarning",
    "--import",
    loaderPath,
    entryPath,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);

if (child.error !== undefined) {
  process.stderr.write(`argus: failed to start: ${child.error.message}\n`);
  process.exit(2);
}
// A child killed by a signal has status === null. That is an aborted,
// incomplete run — exit 2 (operational error), never 1, which would claim the
// scan finished and found violations.
process.exit(child.signal !== null ? 2 : (child.status ?? 2));
