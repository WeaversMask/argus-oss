import type { ScanReport } from "../report.js";
import { shouldUseColour } from "./colour.js";
import { formatConsoleReport } from "./console.js";
import { formatJsonReport } from "./json.js";

/**
 * Formats `argus check --format` accepts, in help order. commander validates
 * against this list, so an unknown format is a usage error (exit 2) rather
 * than a silent fallback to the default.
 */
export const OUTPUT_FORMATS = ["console", "json"] as const;

export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/** The default when `--format` is absent: the human-readable report. */
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "console";

/** Everything the choice of rendering depends on, all of it injected. */
export interface RenderOptions {
  readonly format: OutputFormat;
  /** `false` when `--no-color` was passed; the environment still gets a say. */
  readonly colour: boolean;
  /** Process environment, for the colour decision. */
  readonly env: Readonly<Partial<Record<string, string>>>;
  /** Whether stdout is a terminal, for the colour decision. */
  readonly isTTY: boolean;
}

/**
 * Renders one scan in the requested format — the single place a format is
 * chosen, so commands stay unaware of how many formats exist.
 *
 * **JSON is never coloured**, at any `FORCE_COLOR` setting: `shouldUseColour`
 * is consulted only on the console path, which is why the colour decision needs
 * no JSON-shaped exception inside it.
 */
export function renderReport(report: ScanReport, options: RenderOptions): string {
  switch (options.format) {
    case "json":
      return formatJsonReport(report);
    case "console":
      return formatConsoleReport(report, {
        colour: shouldUseColour({
          env: options.env,
          isTTY: options.isTTY,
          allowed: options.colour,
        }),
      });
    default:
      // Exhaustiveness: a name added to OUTPUT_FORMATS is accepted by
      // `--format` the moment it is listed, so forgetting the branch here has
      // to be a compile error. Without this, the missing case would silently
      // render the human report into a machine's pipeline — the failure
      // `.choices()` exists to prevent, one step removed (review finding).
      return unreachable(options.format);
  }
}

function unreachable(format: never): never {
  throw new Error(`unhandled output format: ${String(format)}`);
}
