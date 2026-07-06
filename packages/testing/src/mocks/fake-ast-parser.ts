import { err, ok, type Result } from "neverthrow";
import type { AstParserPort, FilePath, Language, ParseError, ParsedFile } from "@argus/core";

/**
 * Canned-response `AstParserPort`. Prime a `ParsedFile` per file with
 * `primeParse`; parsing an unprimed file **rejects** with a plain `Error` —
 * no sane default tree exists, so an unprimed call is a test-setup bug and
 * should fail loudly, contract notwithstanding.
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
    _language: Language,
  ): Promise<Result<ParsedFile, ParseError>> {
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
