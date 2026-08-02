import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ConfigLoader } from "@argus/config";
import type { ConfigError, ResolvedConfig } from "@argus/config";
import { LANGUAGES, filePath } from "@argus/core";
import type { AstParserPort, FilePath, RuleActivation, RuleRunInput } from "@argus/core";
import type { ChangeSet } from "@argus/orchestrator";
import { Engine } from "@argus/rule-engine";
import { builtinRules } from "@argus/rules-builtin";
import { resolveActivations } from "./activations.js";
import { discoverFiles } from "./discover.js";
import type { DiscoveredFile } from "./discover.js";
import { EXIT_ERROR } from "./exit-codes.js";
import type { CliIO } from "./io.js";
import { findProjectRoot } from "./project-root.js";
import { escapesProjectRoot, narrowToChanges, resolveChanges } from "./scan-scope.js";
import type { ScanScope } from "./scan-scope.js";
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
  /**
   * Present only under `--diff`. `files` is already narrowed to these, but a
   * command that reports positions must narrow its violations to the changed
   * *lines* as well — a one-line edit still parses the whole file.
   */
  readonly changes?: ChangeSet | undefined;
}

/**
 * Resolves everything a scan needs before any parsing happens: the root path,
 * configuration, the active rule set, and the file list. Returns an exit code
 * instead when the scan cannot proceed — every such case has already been
 * reported to the user.
 */
export async function planScan(
  rawPath: string,
  io: CliIO,
  scope: ScanScope = {},
): Promise<ScanPlan | number> {
  const context = await resolveContext(rawPath, io);
  if (typeof context === "number") {
    return context;
  }
  const { config, projectRoot, activations, rootPath } = context;

  const discovery = await discoverFiles(rootPath, {
    cwd: projectRoot,
    languages: config?.languages ?? LANGUAGES,
    ignore: config?.ignore ?? [],
  });
  if (discovery.isErr()) {
    io.stderr(`argus: ${discovery.error}\n`);
    return EXIT_ERROR;
  }

  // git runs in the project root, so the change set is keyed the same way
  // discovery names its files and `Position.file` records them — one relative
  // vocabulary across the whole scan.
  const changes = await resolveChanges(scope.diffBase, projectRoot, io);
  if (typeof changes === "number") {
    return changes;
  }
  if (changes !== undefined && escapesProjectRoot(discovery.value)) {
    // A `../` path can never be a change-set key, so every file would be
    // narrowed away and the scan would report "nothing changed" — a false
    // green (independent review, #50 LOW-1). Reachable only when nothing on
    // the path's ancestry holds a config, so the root falls back to the cwd.
    io.stderr(`argus: --diff cannot scan ${rawPath}: it is outside the project root\n`);
    io.stderr(`Run argus from a directory containing ${rawPath}, or add an argus.yaml there.\n`);
    return EXIT_ERROR;
  }

  const files = narrowToChanges(discovery.value, changes, { rawPath, scope }, io);
  return { projectRoot, files, activations, changes };
}

/** What a scan resolves before it knows which files exist. */
interface ScanContext {
  readonly config: ResolvedConfig | undefined;
  readonly projectRoot: string;
  readonly activations: readonly RuleActivation[];
  /** The absolute path the scan walks — `rawPath` resolved against the cwd. */
  readonly rootPath: string;
}

/** Config, rule activations and the root every path is expressed against. */
async function resolveContext(rawPath: string, io: CliIO): Promise<ScanContext | number> {
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

  return { config, projectRoot, activations, rootPath };
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
