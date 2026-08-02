import { err, ok } from "neverthrow";
import { filePath, position, ruleId, violation, violationId } from "@argus/core";
import type { Violation } from "@argus/core";
import type { GitRunner } from "../src/index.js";

/** The git subcommands {@link extractChangeSet} issues, in the order it issues them. */
const COMMANDS = ["rev-parse", "merge-base", "diff", "ls-files"] as const;

type Command = (typeof COMMANDS)[number];

/** Canned stdout per subcommand; anything omitted answers with empty output. */
export interface GitScript extends Partial<Record<Command, string>> {
  /** Subcommands that should fail, mapped to the message the runner reports. */
  readonly fails?: Partial<Record<Command, string>>;
}

/** A {@link GitRunner} that answers from a script and records what it was asked. */
export interface FakeGit {
  readonly run: GitRunner;
  /** Every argument list passed, in order. */
  readonly calls: readonly (readonly string[])[];
  /** The argument list for one subcommand, or `undefined` if it was never run. */
  argsFor(command: Command): readonly string[] | undefined;
}

/**
 * Drives the extractor against canned git output.
 *
 * Faking here is not faking the thing under test: the extractor's job is to
 * choose commands and read their output, and both halves stay real. The
 * subprocess is the CLI's `gitRunner`, which has its own test against a
 * genuine repository.
 */
export function fakeGit(script: GitScript = {}): FakeGit {
  const calls: (readonly string[])[] = [];
  const commandOf = (args: readonly string[]): Command | undefined =>
    COMMANDS.find((name) => args.includes(name));

  return {
    calls,
    run: (args) => {
      calls.push(args);
      const command = commandOf(args);
      if (command === undefined) {
        return Promise.resolve(err(`unexpected git invocation: ${args.join(" ")}`));
      }
      const failure = script.fails?.[command];
      if (failure !== undefined) {
        return Promise.resolve(err(failure));
      }
      return Promise.resolve(ok(script[command] ?? ""));
    },
    argsFor: (command) => calls.find((args) => commandOf(args) === command),
  };
}

/** Joins diff lines into the trailing-newline-terminated text git actually emits. */
export function diffText(...lines: readonly string[]): string {
  return `${lines.join("\n")}\n`;
}

/** NUL-separated `ls-files -z` output, including the trailing separator git writes. */
export function nulSeparated(...paths: readonly string[]): string {
  return paths.map((path) => `${path}\0`).join("");
}

/** The span a violation occupies, for tests that only care about the position. */
export interface Span {
  readonly file: string;
  readonly startLine: number;
  readonly endLine?: number;
  readonly startColumn?: number;
  readonly endColumn?: number;
}

/** Builds a real {@link Violation} through core's factories — never a hand-shaped literal. */
export function violationAt(span: Span): Violation {
  const file = filePath(span.file)._unsafeUnwrap();
  const endLine = span.endLine ?? span.startLine;
  const startColumn = span.startColumn ?? 1;
  return violation({
    id: violationId(`${span.file}:${span.startLine}:${startColumn}`)._unsafeUnwrap(),
    ruleId: ruleId("quality/max-function-length")._unsafeUnwrap(),
    severity: "error",
    message: "function is too long",
    position: position({
      file,
      startLine: span.startLine,
      startColumn,
      endLine,
      endColumn: span.endColumn ?? startColumn + 1,
    })._unsafeUnwrap(),
  })._unsafeUnwrap();
}
