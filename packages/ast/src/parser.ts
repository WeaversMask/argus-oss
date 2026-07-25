import { readFile } from "node:fs/promises";
import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { LANGUAGES, ParseError } from "@argus/core";
import type { AstParserPort, FilePath, Language, ParsedFile } from "@argus/core";
import { Language as WasmLanguage, Parser } from "web-tree-sitter";
import { convertTree } from "./convert.js";
import { AstDocument } from "./document.js";
import { grammarWasmPath } from "./languages.js";

/** Constructor options for {@link TreeSitterAstParser}. */
export interface TreeSitterAstParserOptions {
  /**
   * Per-language override for the grammar wasm file. Defaults to the
   * prebuilt artifact inside the installed grammar package
   * (`grammarWasmPath`) — override when bundling relocates the files, or
   * in tests exercising load-failure paths.
   */
  readonly grammarPaths?: Partial<Record<Language, string>>;
}

/**
 * `AstParserPort` implementation on top of tree-sitter's wasm build
 * (ADR-0005 — the native bindings are never loaded).
 *
 * Engine and grammars initialise lazily on first use and are cached per
 * instance; construction is cheap and synchronous. A failed grammar load is
 * evicted from the cache, so a transient failure does not poison later
 * calls.
 *
 * Contract notes (see `AstParserPort`):
 * - never throws — unsupported languages, unreadable/incompatible grammar
 *   files, and anything the wasm engine reports come back as `ParseError`s;
 * - syntactically invalid source still parses into a best-effort tree
 *   containing `ERROR`/missing nodes, exactly as tree-sitter produces it;
 * - positions are 1-based end-exclusive (`convertTree` owns the `+1`).
 */
export class TreeSitterAstParser implements AstParserPort {
  readonly languages: readonly Language[] = LANGUAGES;
  private readonly grammarPaths: Partial<Record<Language, string>>;
  private readonly grammars = new Map<Language, Promise<WasmLanguage>>();
  private engineReady: Promise<void> | undefined;
  private parser: Parser | undefined;

  constructor(options: TreeSitterAstParserOptions = {}) {
    this.grammarPaths = options.grammarPaths ?? {};
  }

  /**
   * Parses to the port's plain-data `ParsedFile`. The intermediate wasm
   * tree is freed before returning — nothing to dispose.
   */
  async parse(
    file: FilePath,
    source: string,
    language: Language,
  ): Promise<Result<ParsedFile, ParseError>> {
    const document = await this.parseDocument(file, source, language);
    return document.map((doc) => {
      const parsed = doc.parsed;
      doc.dispose();
      return parsed;
    });
  }

  /**
   * Parses to an `AstDocument` that can additionally answer S-expression
   * queries. The caller owns it and must `dispose()` it — prefer `parse`
   * when queries are not needed.
   */
  async parseDocument(
    file: FilePath,
    source: string,
    language: Language,
  ): Promise<Result<AstDocument, ParseError>> {
    if (!this.languages.includes(language)) {
      return err(
        new ParseError(
          file,
          `unsupported language "${language}" — this parser handles: ${this.languages.join(", ")}`,
        ),
      );
    }
    try {
      const grammar = await this.grammar(language);
      const parser = this.parserInstance();
      parser.setLanguage(grammar);
      const tree = parser.parse(source);
      if (tree === null) {
        // Only reachable through cancellation options this adapter never
        // passes — defensive completeness for the never-throws contract.
        return err(new ParseError(file, "tree-sitter produced no tree"));
      }
      try {
        const { root, byWasmId } = convertTree(tree.rootNode, source, file);
        const parsed: ParsedFile = Object.freeze({ file, language, root });
        return ok(new AstDocument(parsed, tree, grammar, byWasmId));
      } catch (cause) {
        tree.delete();
        throw cause;
      }
    } catch (cause) {
      return err(new ParseError(file, cause instanceof Error ? cause.message : String(cause)));
    }
  }

  private grammar(language: Language): Promise<WasmLanguage> {
    const cached = this.grammars.get(language);
    if (cached !== undefined) {
      return cached;
    }
    const loading = this.loadGrammar(language);
    this.grammars.set(language, loading);
    // Evict failed loads so a missing/corrupt file is retried, not cached
    // as a permanently rejected promise. The rejection itself still reaches
    // the awaiter in parseDocument.
    void loading.catch(() => this.grammars.delete(language));
    return loading;
  }

  private async loadGrammar(language: Language): Promise<WasmLanguage> {
    await this.engineInit();
    const path = this.grammarPaths[language] ?? grammarWasmPath(language);
    return WasmLanguage.load(await readFile(path));
  }

  private engineInit(): Promise<void> {
    // A failed engine init stays cached: it means the web-tree-sitter
    // install itself is broken and retrying cannot fix it.
    return (this.engineReady ??= Parser.init());
  }

  private parserInstance(): Parser {
    // Safe only after engineInit resolved — `new Parser()` throws before
    // the wasm engine is initialised. Callers await `grammar()` first.
    return (this.parser ??= new Parser());
  }

  /**
   * Releases what the web-tree-sitter API lets us release (review finding,
   * P1-03): the engine `Parser` is deleted (its wasm allocation is not
   * garbage-collected), and cached grammar references are dropped.
   * `Language` exposes **no** free/delete — a loaded grammar's wasm
   * instantiation lives until process exit regardless, which is why the
   * intended steady state is **one adapter instance per process**;
   * instance churn re-instantiates grammar wasm that can never be
   * reclaimed. Idempotent; the instance stays usable (next `parse`
   * re-initialises lazily).
   *
   * Call only when quiescent: no parse in flight, and every `AstDocument`
   * from `parseDocument` already disposed (documents query against the
   * cached grammars).
   */
  dispose(): void {
    this.parser?.delete();
    this.parser = undefined;
    this.grammars.clear();
  }
}
