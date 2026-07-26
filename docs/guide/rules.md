# Built-in rules

> The checks Argus ships with. Ten rules for **TypeScript and JavaScript**, in [`@argus/rules-builtin`](../../packages/rules-builtin/README.md) (P2-01). Each is off until a config activates it (rule-config wiring lands with the CLI); until then this page is the catalogue and the reference. **(fixable)** marks a rule `argus fix` (P2-06) can resolve mechanically, at least some of the time — see [the CLI guide](./cli.md#argus-fix-path) for what `fix` does and does not touch.

Every rule is identified by a `category/name` id, reports at a default severity you can override, and — where noted — takes options. A rule reports a **violation** with a message and a `file:line:col` position; the engine assigns the severity you configured (not the rule's default) to each one.

## Quality

### `quality/cyclomatic-complexity`

Flags functions whose McCabe cyclomatic complexity — `1 + decision points` — exceeds the budget. Decision points are `if`, `for`/`for…of`/`for…in`, `while`, `do`, each `switch` `case` (not `default`), `catch`, the ternary `?:`, and each short-circuiting logical operator — `&&`, `||`, `??` and their assignment forms `&&=`, `||=`, `??=`. Optional chaining (`?.`) is not counted. Counted per function; nested functions are scored on their own.

- **Options:** `max` (default `10`) — inclusive complexity budget.

### `quality/max-file-length`

Flags files longer than the budget. Length counts source lines as an editor's gutter shows them (a single trailing newline is not a line).

- **Options:** `max` (default `300`) — inclusive line budget.

### `quality/max-function-length`

Flags any function form (declaration, function/arrow expression, method, generator) whose line span — first line to last, braces included — exceeds the budget. Nested functions are measured independently.

- **Options:** `max` (default `50`) — inclusive line budget per function.

### `quality/max-nesting-depth`

Flags block nesting deeper than the budget within a function or module scope. Each function starts fresh; an `else if` ladder stays at one level (it is not mistaken for deep nesting); `try`/`catch`/`finally` bodies share one level.

- **Options:** `max` (default `4`) — inclusive nesting budget.

### `quality/no-dead-code`

Flags statements that can never run because an earlier statement in the same block — or `switch` case — ends control flow (`return`, `throw`, `break`, `continue`). Deliberately shallow and sound: a `return` nested in an `if` does not condemn the code after that `if`; trailing comments and hoisted `function` declarations are fine.

## Style

### `style/naming-convention`

Flags declarations that break the standard casing conventions: **types** (`class`, `interface`, `type`, `enum`) must be PascalCase; **functions** — both `function` declarations and `const`s assigned a function/arrow — may be camelCase or PascalCase (PascalCase covers components, factories, and constructor-like functions); **other variables** must be camelCase or `UPPER_SNAKE_CASE`. Only plain-identifier declaration sites are checked — destructuring patterns, parameters, methods, and imported names are left alone. Leading underscores are allowed.

### `style/import-order` (fixable)

Flags top-level imports out of group order. The required order is node builtins (`node:*`, a known builtin, or an unprefixed builtin submodule like `fs/promises`) → external packages (bare specifiers) → relative imports (`./`, `../`). Group-level only, not full alphabetical sorting; `export … from` re-exports are ignored.

**Fixable** (`argus fix`, P2-06) when the block is safe to reorder mechanically: no comment sitting inside the run of imports (it would be silently stranded), and no two imports sharing one line (the gap between them cannot be reconstructed). Otherwise the violation is reported without a fix, for you to resolve by hand.

### `style/no-wildcard-imports`

Flags namespace imports — `import * as ns from "..."` — which obscure a module's real coupling and defeat tree-shaking. Wildcard **re-exports** (`export * from`), a deliberate barrel-file idiom, are allowed.

## Docs

### `docs/require-jsdoc`

Flags exported functions, classes, and interfaces that lack a JSDoc block (`/** … */`) immediately preceding them. Targets the public surface; a line comment (`//`) does not satisfy it. Exported `const`s, type aliases, and enums are out of scope.

## Testing

### `testing/no-empty-test`

Flags `it(...)` / `test(...)` calls whose callback body is empty — a test that asserts nothing yet reports as passing. A comment-only body counts as empty; a pending test with no callback (`it("todo")`) is left alone. Only the bare call forms are matched; member/computed forms (`it.skip`, `it.only`, `it.each([...])(...)`) are not.

---

## Notes

- **Language scope** is TypeScript + JavaScript today. Python parses, but these rules are tuned for TS/JS; Python coverage is planned.
- **Options** are per-activation, validated defensively — a bad `max` (non-integer or `< 1`) fails that rule loudly rather than producing wrong findings.
- **Fixability is per-violation, not just per-rule.** A **(fixable)** rule still reports some violations with no fix attached, whenever it cannot prove the edit is safe for that specific case — see each fixable rule's entry above for what makes it decline.
- **Adding your own rule:** see the developer recipe, [`../dev/adding-a-rule.md`](../dev/adding-a-rule.md) (now includes a section on offering a fix).
