import type { Severity } from "@argus/core";

/** The ambient signals the colour decision reads. Supplied by `CliIO`. */
export interface ColourContext {
  /** Process environment — `NO_COLOR`, `FORCE_COLOR`, `TERM` are consulted. */
  readonly env: Readonly<Partial<Record<string, string>>>;
  /** Whether stdout is attached to a terminal. */
  readonly isTTY: boolean;
  /** `false` when the user passed `--no-color`; omitted means "no preference". */
  readonly allowed?: boolean;
}

/**
 * Decides whether to emit ANSI escapes, most specific signal first:
 *
 * 1. `--no-color` on the command line wins over everything.
 * 2. `FORCE_COLOR`, when set, decides outright: `0` forces colour off, any
 *    other value forces it on. Both directions are the escape hatch — on for a
 *    pipe (`argus check . | less -R`) or a shell profile that sets `NO_COLOR`
 *    globally, off for a terminal that would otherwise get colour.
 * 3. `NO_COLOR` (set and non-empty, per no-color.org) forces colour off.
 * 4. `TERM=dumb` means the terminal cannot render escapes.
 * 5. Otherwise colour follows stdout: on for a terminal, off when redirected.
 */
export function shouldUseColour(context: ColourContext): boolean {
  if (context.allowed === false) {
    return false;
  }
  const forced = context.env["FORCE_COLOR"];
  if (isSet(forced)) {
    // `0` means force off, as chalk, supports-color and Node's own tty
    // detection all read it — the symmetric counterpart of forcing on.
    return forced !== "0";
  }
  if (isSet(context.env["NO_COLOR"])) {
    return false;
  }
  if (context.env["TERM"] === "dumb") {
    return false;
  }
  return context.isTTY;
}

/** An environment variable counts as set only when it is non-empty. */
function isSet(value: string | undefined): boolean {
  return value !== undefined && value !== "";
}

/** Applies one visual role to a string. Identity when colour is disabled. */
export type Style = (text: string) => string;

/**
 * The formatter's vocabulary of visual roles — roles, not colours, so the
 * layout code never branches on whether colour is on.
 */
export interface Styles {
  /** File header lines. */
  readonly path: Style;
  /** `line:col` coordinates — secondary to the message. */
  readonly location: Style;
  /** Trailing rule id — secondary to the message. */
  readonly ruleId: Style;
  /** The summary line of a scan that found nothing. */
  readonly clean: Style;
  /** The note about files that could not be analysed. */
  readonly failure: Style;
  /** Severity labels and counts, coloured by how bad they are. */
  readonly severity: (severity: Severity) => Style;
}

/** The `ESC [` that opens every SGR sequence. */
const ESC = "\u001B[";
const RESET = `${ESC}0m`;

/**
 * Severity palette. Deliberately the base SGR colours (plus bold), which every
 * terminal remaps to its own theme — 256-colour and truecolor values look right
 * on exactly one background and wrong on the other. Colour is never the only
 * carrier of meaning here: the severity word is always printed alongside it.
 */
const SEVERITY_CODES: Readonly<Record<Severity, readonly number[]>> = Object.freeze({
  info: [36], // cyan
  warning: [33], // yellow
  error: [31], // red
  critical: [1, 31], // bold red — one step louder than error
});

function style(codes: readonly number[]): Style {
  return (text) => `${ESC}${codes.join(";")}m${text}${RESET}`;
}

const identity: Style = (text) => text;

const COLOURED: Styles = Object.freeze({
  path: style([1]),
  location: style([2]),
  ruleId: style([2]),
  clean: style([32]),
  failure: style([33]),
  severity: (severity: Severity) => style(SEVERITY_CODES[severity]),
});

const PLAIN: Styles = Object.freeze({
  path: identity,
  location: identity,
  ruleId: identity,
  clean: identity,
  failure: identity,
  severity: () => identity,
});

/** The style set for this run: real ANSI escapes, or identity throughout. */
export function stylesFor(colour: boolean): Styles {
  return colour ? COLOURED : PLAIN;
}
