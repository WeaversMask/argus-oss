import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { matchGlob } from "@argus/core";
import type { Language } from "@argus/core";
import { languageForExtension } from "./languages.js";

/** One source file selected for scanning. */
export interface DiscoveredFile {
  readonly absolutePath: string;
  /** Path relative to `cwd`, `/`-separated — the display path and glob-match subject. */
  readonly relativePath: string;
  readonly language: Language;
}

/** What `discoverFiles` needs to decide which files belong to a scan. */
export interface DiscoveryOptions {
  /** Directory display paths and ignore globs are computed relative to this. */
  readonly cwd: string;
  /** Only files whose extension maps to one of these languages are kept. */
  readonly languages: readonly Language[];
  /** Glob patterns (project-root-relative) to skip, matched with core's `matchGlob`. */
  readonly ignore: readonly string[];
}

/**
 * Directory names never descended into, whatever the config says — build
 * output, VCS metadata, and tooling caches that are never scan targets.
 */
const ALWAYS_IGNORED_DIRS: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".stryker-tmp",
]);

/**
 * Finds the source files to scan under `rootPath`.
 *
 * `rootPath` may be a single file (returned alone if its extension maps to an
 * active language) or a directory (walked recursively). Directories in
 * {@link ALWAYS_IGNORED_DIRS} and paths matching a config `ignore` glob are
 * pruned; symlinks are skipped (neither file nor directory), avoiding cycles.
 * Results are sorted by relative path for deterministic output. Errors that
 * make the scan impossible (missing path, unscannable single file) travel as
 * a message in the `Result`.
 */
export async function discoverFiles(
  rootPath: string,
  options: DiscoveryOptions,
): Promise<Result<readonly DiscoveredFile[], string>> {
  let rootStat;
  try {
    rootStat = await stat(rootPath);
  } catch {
    return err(`path not found: ${rootPath}`);
  }

  const languages = new Set<Language>(options.languages);
  const relativeOf = (absolute: string): string =>
    path.relative(options.cwd, absolute).split(path.sep).join("/");

  if (rootStat.isFile()) {
    const language = languageForExtension(path.extname(rootPath));
    if (language === undefined || !languages.has(language)) {
      return err(`not a scannable source file: ${rootPath}`);
    }
    return ok([{ absolutePath: rootPath, relativePath: relativeOf(rootPath), language }]);
  }

  const found: DiscoveredFile[] = [];
  try {
    await walkDirectory(rootPath, { languages, ignore: options.ignore, relativeOf }, found);
  } catch (cause) {
    return err(
      `could not read directory tree: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  found.sort((a, b) =>
    a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0,
  );
  return ok(found);
}

/** The per-walk context `walkDirectory` threads through the recursion. */
interface WalkContext {
  readonly languages: ReadonlySet<Language>;
  readonly ignore: readonly string[];
  readonly relativeOf: (absolute: string) => string;
}

/**
 * Recursively collects matching files into `found`. Prunes always-ignored and
 * config-ignored directories before descending. Symlinked entries are neither
 * files nor directories to `readdir`'s `withFileTypes`, so they are skipped
 * without a cycle check.
 */
async function walkDirectory(
  dir: string,
  context: WalkContext,
  found: DiscoveredFile[],
): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = context.relativeOf(absolute);
    if (entry.isDirectory()) {
      if (!ALWAYS_IGNORED_DIRS.has(entry.name) && !isIgnored(relative, context.ignore)) {
        await walkDirectory(absolute, context, found);
      }
    } else if (entry.isFile()) {
      const language = languageForExtension(path.extname(entry.name));
      if (language !== undefined && context.languages.has(language)) {
        if (!isIgnored(relative, context.ignore)) {
          found.push({ absolutePath: absolute, relativePath: relative, language });
        }
      }
    }
  }
}

function isIgnored(relativePath: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => matchGlob(pattern, relativePath));
}
