import { Command, CommanderError, Option } from "commander";
import { runCheck } from "./check.js";
import { EXIT_ERROR, EXIT_OK } from "./exit-codes.js";
import { runFix } from "./fix.js";
import { DEFAULT_OUTPUT_FORMAT, OUTPUT_FORMATS } from "./formatters/render.js";
import type { OutputFormat } from "./formatters/render.js";
import { runExplain } from "./explain.js";
import { runInit } from "./init.js";
import type { CliIO } from "./io.js";
import { CLI_VERSION } from "./version.js";

/** Mutable slot an async command action writes its exit code into. */
interface Outcome {
  code: number;
}

/** The flags commander hands `check`'s action. */
interface CheckFlags {
  /** commander's `--no-color` convention: `true` unless the flag was passed. */
  readonly color: boolean;
  /** Constrained by `.choices()`, so no runtime validation is needed here. */
  readonly format: OutputFormat;
  /** The `--diff <ref>` argument; absent when the flag was not passed. */
  readonly diff?: string | undefined;
}

/** The flags commander hands `fix`'s action. */
interface FixFlags {
  readonly dryRun: boolean;
}

/** commander error codes that are successful terminations, not failures. */
const CLEAN_EXIT_CODES: ReadonlySet<string> = new Set([
  "commander.helpDisplayed",
  "commander.version",
]);

/**
 * Parses argv, dispatches to a command, and returns the process exit code —
 * without touching `process`. Every command receives the injected
 * {@link CliIO}, so `run` is a pure function of `(argv, io)` and fully testable.
 * commander's own process exits (help, version, usage errors) are intercepted
 * with `exitOverride` and mapped onto the 0/1/2 convention: help and version
 * are clean (`0`); any other commander error (unknown command/option, missing
 * argument) is a usage error (`2`).
 */
export async function run(argv: readonly string[], io: CliIO): Promise<number> {
  const outcome: Outcome = { code: EXIT_OK };
  const program = buildProgram(io, outcome);

  // Bare `argus` shows help. Done here rather than via a default action so a
  // genuine unknown command still reports "unknown command", not "too many
  // arguments" (commander treats a default-action program's extra token as a
  // stray argument).
  if (argv.length === 0) {
    program.outputHelp();
    return EXIT_OK;
  }

  try {
    await program.parseAsync([...argv], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      return CLEAN_EXIT_CODES.has(error.code) ? EXIT_OK : EXIT_ERROR;
    }
    io.stderr(
      `argus: unexpected error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return EXIT_ERROR;
  }
  return outcome.code;
}

function buildProgram(io: CliIO, outcome: Outcome): Command {
  const program = new Command();
  program
    .name("argus")
    .description("Argus — architecture-aware code quality scanner")
    .version(CLI_VERSION, "-v, --version", "print the Argus version")
    .configureOutput({
      writeOut: (str) => {
        io.stdout(str);
      },
      writeErr: (str) => {
        io.stderr(str);
      },
    })
    .exitOverride();

  addCheckCommand(program, io, outcome);
  addFixCommand(program, io, outcome);

  program
    .command("init")
    .description("Write a starter argus.yaml in the current directory")
    .action(async () => {
      outcome.code = await runInit(io);
    });

  program
    .command("explain")
    .description("Describe a built-in rule")
    .argument("<rule-id>", "rule id, e.g. quality/cyclomatic-complexity")
    .action((ruleId: string) => {
      outcome.code = runExplain(ruleId, io);
    });

  return program;
}

/**
 * Declares `check` and its flags — the one command with enough surface to build
 * apart. It is attached through `program.command()` rather than built standalone
 * and `addCommand`ed: `command()` copies the program's inherited settings, and
 * without them a usage error on this subcommand would call `process.exit`
 * directly instead of routing through `exitOverride` and the 0/1/2 contract.
 */
function addCheckCommand(program: Command, io: CliIO, outcome: Outcome): void {
  program
    .command("check")
    .description("Scan a path and report rule violations")
    .argument("[path]", "file or directory to scan", ".")
    // commander turns a lone `--no-x` into an option defaulting to true, so
    // `color` is true unless the flag is present. Colour is then still subject
    // to NO_COLOR/FORCE_COLOR/TERM and whether stdout is a terminal.
    .option("--no-color", "disable coloured output")
    // `.choices()` makes an unknown format a CommanderError, i.e. exit 2 —
    // a typo must fail loudly rather than fall back to the human format and
    // hand a CI job unparseable text.
    .addOption(
      new Option("-f, --format <format>", "output format")
        .choices([...OUTPUT_FORMATS])
        .default(DEFAULT_OUTPUT_FORMAT),
    )
    // Deliberately no default: `--diff` with no value is a usage error rather
    // than an implicit `main`, because guessing the base ref wrong reports
    // either nothing or everything, and both look like the tool working.
    .option("--diff <ref>", "report only violations on lines changed since <ref>")
    .action(async (target: string, options: CheckFlags) => {
      outcome.code = await runCheck(
        target,
        { colour: options.color, format: options.format, diffBase: options.diff },
        io,
      );
    });
}

/** Declares `fix` and its flags — same attachment reasoning as `addCheckCommand`. */
function addFixCommand(program: Command, io: CliIO, outcome: Outcome): void {
  program
    .command("fix")
    .description("Apply safe fixes for violations that offer one")
    .argument("[path]", "file or directory to fix", ".")
    .option("--dry-run", "show what would change without writing files")
    .action(async (target: string, options: FixFlags) => {
      outcome.code = await runFix(target, { dryRun: options.dryRun === true }, io);
    });
}
