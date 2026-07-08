import { err, ok, type Result } from "neverthrow";
import type {
  DependencyResolverPort,
  FileDependencies,
  FilePath,
  ResolutionError,
} from "@argus/core";

const NO_IMPORTS: readonly FilePath[] = Object.freeze([]);

/**
 * Canned-response `DependencyResolverPort`: prime import edges per file
 * with `prime`; unprimed files resolve to no imports (the common case, and
 * a safe default for layer tests). Failure injection via `failNextWith`.
 */
export class FakeDependencyResolver implements DependencyResolverPort {
  private readonly imports = new Map<FilePath, readonly FilePath[]>();
  private nextError: ResolutionError | undefined;

  prime(file: FilePath, imports: readonly FilePath[]): void {
    this.imports.set(file, Object.freeze([...imports]));
  }

  failNextWith(error: ResolutionError): void {
    this.nextError = error;
  }

  resolve(file: FilePath, _source: string): Promise<Result<FileDependencies, ResolutionError>> {
    const error = this.nextError;
    this.nextError = undefined;
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    return Promise.resolve(
      ok(Object.freeze({ file, imports: this.imports.get(file) ?? NO_IMPORTS })),
    );
  }
}
