import { existsSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

/**
 * Node module-resolution hook (registered by loader/register.mjs).
 *
 * The Argus workspace is buildless: every `@argus/*` package exports raw
 * TypeScript and imports its own internals with `.js` specifiers (TS
 * `moduleResolution: "bundler"`) that only a bundler or Vitest would resolve.
 * This hook remaps a relative `.js` specifier to its `.ts` sibling when that
 * sibling exists on disk. Combined with Node's `--experimental-transform-types`
 * it lets the CLI run the raw-TS workspace with no build and no extra runtime
 * dependency (maintainer-approved runtime decision, P2-02).
 *
 * Everything else falls through to Node's default resolver untouched: bare
 * specifiers (`commander`, and `@argus/*` whose `exports` already point at
 * `.ts`), Node builtins, and genuine `.js`/`.mjs` files.
 */
export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && specifier.endsWith(".js")) {
    const tsSpecifier = `${specifier.slice(0, -3)}.ts`;
    if (context.parentURL !== undefined) {
      const candidate = new URL(tsSpecifier, context.parentURL);
      if (candidate.protocol === "file:" && existsSync(fileURLToPath(candidate))) {
        return nextResolve(tsSpecifier, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
