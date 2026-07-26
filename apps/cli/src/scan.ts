import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ConfigLoader } from "@argus/config";
import type { ConfigError, ResolvedConfig } from "@argus/config";
import { LANGUAGES, filePath } from "@argus/core";
import type { AstParserPort, FilePath, RuleActivation, RuleRunInput } from "@argus/core";
import { Engine } from "@argus/rule-engine";
import { builtinRules } from "@argus/rules-builtin";
import { resolveActivations } from "./activations.js";
import { discoverFiles } from "./discover.js";
import type { DiscoveredFile } from "./discover.js";
import { EXIT_ERROR } from "./exit-codes.js";
import type { CliIO } from "./io.js";
import { findProjectRoot } from "./project-root.js";
import type { ScanFailure } from "./report.js";

/**
 * The config → discover → parse → engine pipeline shared by `check` and
 * `fix`. Neither command's own presentation logic (report rendering,
 * fix application) lives here.
 */

/** Files parsed successfully, plus the ones that could not be read or parsed. */
export interface ParseOutcome {
  readonly inputs: readonly RuleRunInput[];
  readonly failures: readonly ScanFailure[];
  /**
   * The exact text read from disk, per file — what a mutating command must
   * splice against.
   *
   * Deliberately **not** `parsed.root.text`: tree-sitter's `program` node
   * starts at the first token, so a file beginning with a blank line, space,
   * tab, or BOM yields a root whose text is a *truncated* copy of the source
   * while every `Position` stays absolute. Offsets computed against that copy
   * are silently shifted, which corrupts the file (independent review, #39
   * HIGH-1 — reproduced: a comment deleted, an import duplicated, exit 0).
   */
  readonly sources: ReadonlyMap<FilePath, string>;
}

/** A scan that is ready to execute: what to scan, and with which rules. */
export interface ScanPlan {
  readonly projectRoot: string;
  readonly files: readonly DiscoveredFile[];
  readonly activations: readonly RuleActivation[];
}

/**
 * Resolves everything a scan needs before any parsing happens: the root path,
 * configuration, the active rule set, and the file list. Returns an exit code
 * instead when the scan cannot proceed — every such case has already been
 * reported to the user.
 */
export async function planScan(rawPath: string, io: CliIO): Promise<ScanPlan | number> {
  const rootPath = path.resolve(io.cwd, rawPath);

  const rootIsDirectory = await isDirectory(rootPath);
  if (rootIsDirectory === undefined) {
    io.stderr(`argus: path not found: ${rawPath}\n`);
    return EXIT_ERROR;
  }

  const searchFrom = rootIsDirectory ? rootPath : path.dirname(rootPath);
  const configResult = await new ConfigLoader().search(searchFrom);
  if (configResult.isErr()) {
    reportConfigError(configResult.error, io);
    return EXIT_ERROR;
  }
  const config = configResult.value;

  const activations = resolveConfiguredActivations(config, io);
  if (activations === undefined) {
    return EXIT_ERROR;
  }

  // Paths are expressed relative to the project root (the config's own
  // directory), not the invocation directory — otherwise a root config's
  // `ignore:` globs would silently stop matching when the user runs argus
  // from a subdirectory. See findProjectRoot.
  const projectRoot = await findProjectRoot(searchFrom, io.cwd);

  const discovery = await discoverFiles(rootPath, {
    cwd: projectRoot,
    languages: config?.languages ?? LANGUAGES,
    ignore: config?.ignore ?? [],
  });
  if (discovery.isErr()) {
    io.stderr(`argus: ${discovery.error}\n`);
    return EXIT_ERROR;
  }
  if (discovery.value.length === 0) {
    // Not an error: a path with nothing scannable under it is a successful
    // scan of zero files. The plan continues with an empty file list rather
    // than returning early, so stdout still carries a report — a `--format
    // json` consumer must never receive an empty stream from a scan that
    // succeeded.
    io.stderr(`argus: no matching source files under ${rawPath}\n`);
  }

  return { projectRoot, files: discovery.value, activations };
}

/** `true`/`false` for an existing path, `undefined` when it does not exist. */
async function isDirectory(target: string): Promise<boolean | undefined> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return undefined;
  }
}

/**
 * Rule activations for this run, or `undefined` after reporting that config
 * named rules the built-in catalogue does not provide.
 */
function resolveConfiguredActivations(
  config: ResolvedConfig | undefined,
  io: CliIO,
): readonly RuleActivation[] | undefined {
  const { activations, unknownRuleIds } = resolveActivations(config);
  if (unknownRuleIds.length === 0) {
    return activations;
  }
  const label = unknownRuleIds.length === 1 ? "id" : "ids";
  io.stderr(`argus: config activates unknown rule ${label}: ${unknownRuleIds.join(", ")}\n`);
  io.stderr("Run `argus explain <rule-id>` or see docs/guide/rules.md for the catalogue.\n");
  return undefined;
}

/** Reads and parses every discovered file, collecting per-file failures. */
export async function parseAll(
  files: readonly DiscoveredFile[],
  parser: AstParserPort,
  activations: readonly RuleActivation[],
): Promise<ParseOutcome> {
  const inputs: RuleRunInput[] = [];
  const failures: ScanFailure[] = [];
  const sources = new Map<FilePath, string>();

  for (const file of files) {
    let source: string;
    try {
      source = await readFile(file.absolutePath, "utf8");
    } catch (cause) {
      failures.push({ file: file.relativePath, message: `could not read file: ${message(cause)}` });
      continue;
    }
    const validated = filePath(file.relativePath);
    if (validated.isErr()) {
      failures.push({ file: file.relativePath, message: validated.error.message });
      continue;
    }
    const parsed = await parser.parse(validated.value, source, file.language);
    if (parsed.isErr()) {
      failures.push({ file: file.relativePath, message: parsed.error.message });
      continue;
    }
    inputs.push({ parsed: parsed.value, activations });
    sources.set(validated.value, source);
  }

  return { inputs, failures, sources };
}

/** An engine with every built-in rule registered, or `undefined` after reporting a clash. */
export function buildEngine(io: CliIO): Engine | undefined {
  const engine = new Engine();
  for (const module of builtinRules) {
    const registered = engine.register(module);
    if (registered.isErr()) {
      // Unreachable: builtinRules have unique ids. Surfaced loudly should that change.
      io.stderr(`argus: internal error registering rules: ${registered.error.message}\n`);
      return undefined;
    }
  }
  return engine;
}

function reportConfigError(error: ConfigError, io: CliIO): void {
  io.stderr("argus: configuration error\n");
  for (const issue of error.issues) {
    const location =
      issue.line === undefined ? issue.file : `${issue.file}:${issue.line}:${issue.column ?? 1}`;
    const dotPath = issue.path === "" ? "" : ` ${issue.path}`;
    io.stderr(`  ${location}${dotPath} — ${issue.message}\n`);
  }
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
