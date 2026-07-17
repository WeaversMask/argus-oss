import { DomainError } from "@argus/core";

/**
 * An S-expression query could not be compiled or run against a document
 * (`AstDocument.query`) — malformed query source, a capture on a node type
 * the grammar does not define, or a query against a disposed document.
 *
 * Final: instances freeze themselves in the constructor — compose rather
 * than extend (mirrors core's error classes).
 */
export class QueryError extends DomainError {
  override readonly name = "QueryError";
  readonly code = "ast/query";

  constructor(message: string) {
    super(message);
    Object.freeze(this);
  }
}
