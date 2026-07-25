import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { TreeSitterAstParser } from "@argus/ast";
import { ConfigLoader } from "@argus/config";
import type { ConfigError, ResolvedConfig } from "@argus/config";
import { LANGUAGES, filePath } from "@argus/core";
import type { AstParserPort, RuleActivation, RuleRunInput } from "@argus/core";
import { Engine, Runner } from "@argus/rule-engine";
import { builtinRules } from "@argus/rules-builtin";
import { resolveActivations } from "./activations.js";
import { discoverFiles } from "./discover.js";
import type { DiscoveredFile } from "./discover.js";
import { EXIT_ERROR, EXIT_OK, EXIT_VIOLATIONS } from "./exit-codes.js";
import { shouldUseColour } from "./formatters/colour.js";
import { formatConsoleReport } from "./formatters/console.js";
import type { CliIO } from "./io.js";
import { findProjectRoot } from "./project-root.js";
import type { ScanFailure } from "./report.js";

/** Files parsed successfully, plus the ones that could not be read or parsed. */
interface ParseOutcome {
  readonly inputs: readonly RuleRunInput[];
  readonly failures: readonly ScanFailure[];
}

/** A scan that is ready to execute: what to scan, and with which rules. */
interface ScanPlan {
  readonly files: readonly DiscoveredFile[];
  readonly activations: readonly RuleActivation[];
}

/** Invocation-level presentation choices for `check`. */
export interface CheckOptions {
  /** `false` when `--no-color` was passed; `true` leaves the decision to the environment. */
  readonly colour: boolean;
}

/**
 * The `check` command: config → discover → parse → engine → report.
 *
 * Composes the real pipeline against the ten built-in rules and returns the
 * process exit code. A configuration failure, missing path, unknown configured
 * rule, or any file that could not be parsed/analysed is an operational error
 * (`2`); a clean scan with findings is `1`; a clean scan with none is `0`.
 *
 * Suppressions and layer classification are not wired: config v1 exposes
 * neither section (deferred, P2/P3-01), so there is nothing to feed
 * `matchingSuppression`/`classifyLayer` yet.
 */
export async function runCheck(rawPath: string, options: CheckOptions, io: CliIO): Promise<number> {
  const plan = await planScan(rawPath, io);
  if (typeof plan === "number") {
    return plan;
  }

  // One parser instance per process: the grammar wasm it loads cannot be freed
  // (see @argus/ast), so instance churn leaks. Disposed once the scan is done.
  const parser = new TreeSitterAstParser();
  try {
    const parsed = await parseAll(plan.files, parser, plan.activations);
    const engine = buildEngine(io);
    if (engine === undefined) {
      return EXIT_ERROR;
    }

    const summary = await new Runner(engine).runAll(parsed.inputs);
    const failures = [
      ...parsed.failures,
      ...summary.failures.map((failure) => ({
        file: failure.file,
        message: failure.error.message,
      })),
    ];

    for (const failure of failures) {
      io.stderr(`argus: failed to analyse ${failure.file}: ${failure.message}\n`);
    }
    io.stdout(
      formatConsoleReport(
        { violations: summary.violations, failures, filesScanned: plan.files.length },
        { colour: shouldUseColour({ env: io.env, isTTY: io.isTTY, allowed: options.colour }) },
      ),
    );

    if (failures.length > 0) {
      return EXIT_ERROR;
    }
    return summary.violations.length > 0 ? EXIT_VIOLATIONS : EXIT_OK;
  } finally {
    parser.dispose();
  }
}

/**
 * Resolves everything a scan needs before any parsing happens: the root path,
 * configuration, the active rule set, and the file list. Returns an exit code
 * instead when the scan cannot proceed — every such case has already been
 * reported to the user.
 */
async function planScan(rawPath: string, io: CliIO): Promise<ScanPlan | number> {
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
    io.stderr(`argus: no matching source files under ${rawPath}\n`);
    return EXIT_OK;
  }

  return { files: discovery.value, activations };
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
async function parseAll(
  files: readonly DiscoveredFile[],
  parser: AstParserPort,
  activations: readonly RuleActivation[],
): Promise<ParseOutcome> {
  const inputs: RuleRunInput[] = [];
  const failures: ScanFailure[] = [];

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
  }

  return { inputs, failures };
}

/** An engine with every built-in rule registered, or `undefined` after reporting a clash. */
function buildEngine(io: CliIO): Engine | undefined {
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
