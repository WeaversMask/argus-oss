import type { ScanId } from "../domain/ids.js";
import { DomainError } from "./domain-error.js";

/**
 * A scan lifecycle transition whose timestamps are inconsistent (e.g. a
 * scan finishing before it started). Wrong-*status* transitions are ruled
 * out at compile time by the `Scan` discriminated union; this error covers
 * what the type system cannot.
 */
export class ScanTransitionError extends DomainError {
  override readonly name = "ScanTransitionError";
  readonly code = "core/scan-transition";
  readonly scanId: ScanId;

  constructor(scanId: ScanId, message: string) {
    super(`Scan "${scanId}": ${message}`);
    this.scanId = scanId;
    Object.freeze(this);
  }
}
