declare const brand: unique symbol;

/**
 * Nominal-typing helper: `Brand<string, "RuleId">` is assignable where a
 * plain `string` is expected, but a plain string — or a differently branded
 * one — is not assignable to it. The symbol never exists at runtime; the
 * only way to obtain a branded value is through its validating factory.
 */
export type Brand<T, B extends string> = T & { readonly [brand]: B };
