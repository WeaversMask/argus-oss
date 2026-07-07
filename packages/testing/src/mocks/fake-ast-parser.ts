import { err, ok, type Result } from "neverthrow";
import type { AstParserPort, FilePath, Language, ParseError, ParsedFile } from "@argus/core";

/**
 * Canned-response `AstParserPort`. Prime a `ParsedFile` per file with
 * `primeParse`; parsing an unprimed file — or passing a language outside
 * `languages` (review finding on #13: the one contract clause a fake can
 * cheaply enforce) — **rejects** with a plain `Error`: both are test-setup
 * bugs and should fail loudly, contract notwithstanding.
 *
 * The default `languages` mirrors core's `LANGUAGES`; it is a literal so
 * this module keeps zero runtime imports from `@argus/core` (the union
 * type still compile-checks each entry).
 */
export class FakeAstParser implements AstParserPort {
  readonly languages: readonly Language[];
  private readonly responses = new Map<FilePath, ParsedFile>();
  private nextError: ParseError | undefined;

  constructor(languages: readonly Language[] = ["typescript", "javascript", "python"]) {
    this.languages = Object.freeze([...languages]);
  }

  primeParse(parsed: ParsedFile): void {
    this.responses.set(parsed.file, parsed);
  }

  failNextWith(error: ParseError): void {
    this.nextError = error;
  }

  parse(
    file: FilePath,
    _source: string,
    language: Language,
  ): Promise<Result<ParsedFile, ParseError>> {
    if (!this.languages.includes(language)) {
      return Promise.reject(
        new Error(
          `FakeAstParser.parse: language "${language}" is outside this fake's languages (${this.languages.join(", ")}) — construct the fake with the languages the test needs`,
        ),
      );
    }
    const error = this.nextError;
    this.nextError = undefined;
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    const parsed = this.responses.get(file);
    if (parsed === undefined) {
      return Promise.reject(
        new Error(`FakeAstParser.parse: no response primed for "${file}" — call primeParse`),
      );
    }
    return Promise.resolve(ok(parsed));
  }
}
