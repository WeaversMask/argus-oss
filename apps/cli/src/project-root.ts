import { stat } from "node:fs/promises";
import path from "node:path";
import { CONFIG_FILE_NAMES } from "@argus/config";

/**
 * Finds the project root for a scan: the nearest directory at or above
 * `fromDir` that holds an Argus config file, falling back to `fallback` when
 * there is none.
 *
 * This is the base every path in a scan is expressed against — both the
 * displayed path of a finding and the subject an `ignore:` glob is matched
 * on. Anchoring to the config's own directory is what makes those globs mean
 * the same thing wherever `argus` is invoked from: a root config saying
 * an ignore glob of `packages/<star>/generated/<star><star>` must keep
 * excluding those files when the user runs `argus check .` from inside
 * `packages/foo`, where the invocation-relative path is merely
 * `generated/…`. (`<star>` stands in for a literal `*`: spelling the glob out
 * would close this comment block.)
 *
 * It mirrors the upward walk `ConfigLoader.search` performs (via cosmiconfig)
 * using the same public `CONFIG_FILE_NAMES`, because the loader returns the
 * merged config without reporting which file it came from.
 */
export async function findProjectRoot(fromDir: string, fallback: string): Promise<string> {
  let current = path.resolve(fromDir);
  for (;;) {
    if (await hasConfig(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(fallback);
    }
    current = parent;
  }
}

async function hasConfig(dir: string): Promise<boolean> {
  for (const name of CONFIG_FILE_NAMES) {
    try {
      if ((await stat(path.join(dir, name))).isFile()) {
        return true;
      }
    } catch {
      // absent or unreadable — keep looking
    }
  }
  return false;
}
