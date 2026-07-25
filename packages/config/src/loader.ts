import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { cosmiconfig } from "cosmiconfig";
import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { ConfigError } from "./errors.js";
import { mergeRaw } from "./merge.js";
import { toResolvedConfig } from "./resolved.js";
import type { ResolvedConfig } from "./resolved.js";
import type { RawConfig } from "./schema.js";
import { validateConfigText } from "./validate.js";

/** File names recognised as Argus configuration, in search order. */
export const CONFIG_FILE_NAMES: readonly string[] = Object.freeze(["argus.yaml", "argus.yml"]);

/** cosmiconfig loader that hands the raw text through — parsing stays ours so positions survive. */
function rawTextLoader(_filepath: string, content: string): string {
  return content;
}

async function firstExisting(dir: string): Promise<string | undefined> {
  for (const name of CONFIG_FILE_NAMES) {
    const candidate = path.join(dir, name);
    try {
      if ((await stat(candidate)).isFile()) {
        return candidate;
      }
    } catch {
      // absent or unreadable — keep looking
    }
  }
  return undefined;
}

/**
 * Loads, inherits, merges, and validates `argus.yaml` configuration.
 *
 * - `load(file)` — one explicit file, with its `extends:` chain resolved
 *   (relative paths, depth-first, cycle-detected; bases first, extender
 *   wins; multiple entries left-to-right, later wins).
 * - `search(fromDir)` — cosmiconfig discovery: nearest config walking up
 *   from `fromDir`. Absence is `ok(undefined)`, never an error.
 * - `loadHierarchy(fromDir, stopDir)` — the org → team → repo → path
 *   story in one repo: every config on the directory chain from `stopDir`
 *   (outermost) down to `fromDir` (innermost), merged outermost-first so
 *   the nearest file wins. Each file's own `extends:` resolves before it
 *   joins the merge.
 *
 * All failures travel as `ConfigError` in the `Result`; the loader reads
 * files fresh on every call (no caching — a scan is short-lived and stale
 * config is worse than a few reads).
 */
export class ConfigLoader {
  private readonly explorer = cosmiconfig("argus", {
    searchPlaces: [...CONFIG_FILE_NAMES],
    loaders: { ".yaml": rawTextLoader, ".yml": rawTextLoader },
    cache: false,
    // cosmiconfig 9 defaults to searching only the given directory;
    // "global" restores walk-up-to-home discovery (the ESLint-like story).
    searchStrategy: "global",
  });

  async load(file: string): Promise<Result<ResolvedConfig, ConfigError>> {
    const chain = await this.resolveChain(path.resolve(file), []);
    return chain.andThen(toResolvedConfig);
  }

  async search(fromDir: string): Promise<Result<ResolvedConfig | undefined, ConfigError>> {
    let found: { readonly filepath: string } | null;
    try {
      found = await this.explorer.search(path.resolve(fromDir));
    } catch (cause) {
      // Defensive, uncovered: our loader never throws, so only filesystem
      // faults (permissions, races) land here — kept so they surface as
      // values, not rejections.
      return err(
        new ConfigError("Configuration discovery failed", [
          {
            file: path.resolve(fromDir),
            path: "",
            message: cause instanceof Error ? cause.message : "unknown error",
          },
        ]),
      );
    }
    if (found === null) {
      return ok(undefined);
    }
    return this.load(found.filepath);
  }

  async loadHierarchy(
    fromDir: string,
    stopDir: string,
  ): Promise<Result<ResolvedConfig | undefined, ConfigError>> {
    const from = path.resolve(fromDir);
    const stop = path.resolve(stopDir);
    const relative = path.relative(stop, from);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return err(
        new ConfigError("Invalid hierarchy bounds", [
          { file: from, path: "", message: `is not inside ${stop}` },
        ]),
      );
    }
    const dirs = [stop];
    let current = stop;
    for (const segment of relative === "" ? [] : relative.split(path.sep)) {
      current = path.join(current, segment);
      dirs.push(current);
    }
    let merged: RawConfig | undefined;
    for (const dir of dirs) {
      const file = await firstExisting(dir);
      if (file === undefined) {
        continue;
      }
      const chain = await this.resolveChain(file, []);
      if (chain.isErr()) {
        return err(chain.error);
      }
      merged = merged === undefined ? chain.value : mergeRaw(merged, chain.value);
    }
    if (merged === undefined) {
      return ok(undefined);
    }
    return toResolvedConfig(merged);
  }

  /** Reads `absoluteFile` and validates its text, wrapping IO failures as a `ConfigError`. */
  private async readAndValidate(absoluteFile: string): Promise<Result<RawConfig, ConfigError>> {
    let text: string;
    try {
      text = await readFile(absoluteFile, "utf8");
    } catch (cause) {
      return err(
        new ConfigError("Cannot read configuration file", [
          {
            file: absoluteFile,
            path: "",
            message: cause instanceof Error ? cause.message : "unknown error",
          },
        ]),
      );
    }
    return validateConfigText(absoluteFile, text);
  }

  /** Reads + validates one file and folds in its `extends:` bases, depth-first. */
  private async resolveChain(
    absoluteFile: string,
    stack: readonly string[],
  ): Promise<Result<RawConfig, ConfigError>> {
    if (stack.includes(absoluteFile)) {
      const cycle = [...stack.slice(stack.indexOf(absoluteFile)), absoluteFile];
      return err(
        new ConfigError("Configuration extends cycle", [
          { file: absoluteFile, path: "extends", message: `cycle: ${cycle.join(" → ")}` },
        ]),
      );
    }
    const validated = await this.readAndValidate(absoluteFile);
    if (validated.isErr()) {
      return validated;
    }
    const config = validated.value;
    const bases =
      config.extends === undefined
        ? []
        : typeof config.extends === "string"
          ? [config.extends]
          : config.extends;
    let merged: RawConfig = {};
    const nextStack = [...stack, absoluteFile];
    for (const entry of bases) {
      const base = await this.resolveChain(
        path.resolve(path.dirname(absoluteFile), entry),
        nextStack,
      );
      if (base.isErr()) {
        return base;
      }
      merged = mergeRaw(merged, base.value);
    }
    const { extends: _extends, ...own } = config;
    return ok(mergeRaw(merged, own));
  }
}
