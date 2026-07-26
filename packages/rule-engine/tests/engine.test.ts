import { describe, expect, it } from "vitest";
import { RuleExecutionError, ValidationError } from "@argus/core";
import type { AstNode, Position, Violation } from "@argus/core";
import { Engine } from "../src/index.js";
import type { RuleContext, RuleListener, RuleListeners } from "../src/index.js";
import {
  DEFAULT_FILE,
  activationOf,
  chainTree,
  collectNodes,
  inputOf,
  makeNode,
  moduleOf,
  ruleOf,
  someFile,
  someLayer,
  syntheticTree,
} from "./helpers.js";

/**
 * `let x` as a synthetic tree: a declaration with an anonymous `let`
 * keyword child and a named identifier child — the dispatch fixtures'
 * workhorse.
 */
function declarationTree(): AstNode {
  return makeNode({
    nodeType: "program",
    startLine: 1,
    children: [
      makeNode({
        nodeType: "lexical_declaration",
        startLine: 2,
        children: [
          makeNode({ nodeType: "let", startLine: 2, startColumn: 1, endColumn: 4, text: "let" }),
          makeNode({
            nodeType: "identifier",
            fieldName: "name",
            startLine: 2,
            startColumn: 5,
            endColumn: 6,
            text: "x",
          }),
        ],
      }),
      makeNode({
        nodeType: "identifier",
        startLine: 3,
        text: "y",
      }),
    ],
  });
}

describe("dispatch", () => {
  it("dispatches enter listeners to nodes of the subscribed type, in pre-order", async () => {
    const engine = new Engine();
    const seen: string[] = [];
    engine
      .register(
        moduleOf("collect-identifiers", {
          identifier: (node) => {
            seen.push(node.text);
          },
        }),
      )
      ._unsafeUnwrap();

    const result = await engine.run(
      inputOf(declarationTree(), [activationOf("collect-identifiers")]),
    );

    expect(result._unsafeUnwrap()).toEqual([]);
    expect(seen).toEqual(["x", "y"]);
  });

  it("dispatches :exit listeners post-order, after all children", async () => {
    const engine = new Engine();
    const events: string[] = [];
    engine
      .register(
        moduleOf("order", {
          lexical_declaration: () => {
            events.push("enter:decl");
          },
          "lexical_declaration:exit": () => {
            events.push("exit:decl");
          },
          identifier: (node) => {
            events.push(`enter:${node.text}`);
          },
        }),
      )
      ._unsafeUnwrap();

    (await engine.run(inputOf(declarationTree(), [activationOf("order")])))._unsafeUnwrap();

    expect(events).toEqual(["enter:decl", "enter:x", "exit:decl", "enter:y"]);
  });

  it('subscribes to a literal "then" node type without being mistaken for a Promise', async () => {
    // Regression (review #24): a listeners map with a `then` key is a
    // then-keyed dispatch table, not a thenable — duck-typing would have
    // rejected it as an async create().
    const engine = new Engine();
    let thens = 0;
    engine
      .register(
        moduleOf("then-rule", {
          then: () => {
            thens += 1;
          },
        }),
      )
      ._unsafeUnwrap();
    const tree = makeNode({
      nodeType: "program",
      children: [makeNode({ nodeType: "then", startLine: 2, text: "then" })],
    });

    (await engine.run(inputOf(tree, [activationOf("then-rule")])))._unsafeUnwrap();

    expect(thens).toBe(1);
  });

  it("dispatches anonymous node types (keywords, punctuation)", async () => {
    const engine = new Engine();
    let keywords = 0;
    engine
      .register(
        moduleOf("no-let", {
          let: () => {
            keywords += 1;
          },
        }),
      )
      ._unsafeUnwrap();

    (await engine.run(inputOf(declarationTree(), [activationOf("no-let")])))._unsafeUnwrap();

    expect(keywords).toBe(1);
  });

  it('wildcard "*" and "*:exit" see every node exactly once', async () => {
    const engine = new Engine();
    const entered: string[] = [];
    const exited: string[] = [];
    engine
      .register(
        moduleOf("all-nodes", {
          "*": (node) => {
            entered.push(node.nodeType);
          },
          "*:exit": (node) => {
            exited.push(node.nodeType);
          },
        }),
      )
      ._unsafeUnwrap();

    const tree = declarationTree();
    (await engine.run(inputOf(tree, [activationOf("all-nodes")])))._unsafeUnwrap();

    const expected = collectNodes(tree).map((node) => node.nodeType);
    expect(entered).toEqual(expected);
    expect(exited).toHaveLength(expected.length);
    expect(exited.at(-1)).toBe("program");
  });

  it("dispatches every rule subscribed to the same node type", async () => {
    const engine = new Engine();
    const fired: string[] = [];
    for (const id of ["rule-a", "rule-b"]) {
      engine
        .register(
          moduleOf(id, {
            identifier: () => {
              fired.push(id);
            },
          }),
        )
        ._unsafeUnwrap();
    }

    (
      await engine.run(inputOf(declarationTree(), [activationOf("rule-a"), activationOf("rule-b")]))
    )._unsafeUnwrap();

    expect(fired.filter((id) => id === "rule-a")).toHaveLength(2);
    expect(fired.filter((id) => id === "rule-b")).toHaveLength(2);
  });

  it("collects reports made during create() itself", async () => {
    const engine = new Engine();
    engine
      .register(
        moduleOf("file-level", (context: RuleContext) => {
          context.report({
            message: "file-level finding",
            position: {
              file: context.file,
              startLine: 1,
              startColumn: 1,
              endLine: 1,
              endColumn: 2,
            },
          });
          return {};
        }),
      )
      ._unsafeUnwrap();

    const violations = (
      await engine.run(inputOf(declarationTree(), [activationOf("file-level")]))
    )._unsafeUnwrap();

    expect(violations).toHaveLength(1);
    expect(violations[0]!.message).toBe("file-level finding");
  });
});

describe("violations", () => {
  function reportEverything(engine: Engine, id = "flag-identifiers"): void {
    engine
      .register(
        moduleOf(id, (context: RuleContext) => ({
          identifier: (node) => {
            context.report({ message: `flagged ${node.text}`, position: node.position });
          },
        })),
      )
      ._unsafeUnwrap();
  }

  it("assigns the activation's severity, not the rule's default", async () => {
    const engine = new Engine();
    reportEverything(engine);

    const violations = (
      await engine.run(inputOf(declarationTree(), [activationOf("flag-identifiers", "critical")]))
    )._unsafeUnwrap();

    expect(violations).toHaveLength(2);
    for (const found of violations) {
      expect(found.severity).toBe("critical");
    }
  });

  it("threads an offered fix onto the violation, and omits the key when none was offered", async () => {
    const engine = new Engine();
    engine
      .register(
        moduleOf("flag-identifiers", (context: RuleContext) => ({
          identifier: (node) => {
            context.report({
              message: `flagged ${node.text}`,
              position: node.position,
              ...(node.text === "x" ? { fix: { position: node.position, replacement: "z" } } : {}),
            });
          },
        })),
      )
      ._unsafeUnwrap();

    const violations = (
      await engine.run(inputOf(declarationTree(), [activationOf("flag-identifiers")]))
    )._unsafeUnwrap();

    expect(violations).toHaveLength(2);
    const [withFix, withoutFix] = violations;
    expect(withFix!.fix).toEqual({ position: withFix!.position, replacement: "z" });
    expect("fix" in withoutFix!).toBe(false);
  });

  it("threads the input layer onto every violation, and omits it when unclassified", async () => {
    const engine = new Engine();
    reportEverything(engine);
    const activations = [activationOf("flag-identifiers")];

    const layered = (
      await engine.run(inputOf(declarationTree(), activations, { layer: someLayer() }))
    )._unsafeUnwrap();
    const unlayered = (await engine.run(inputOf(declarationTree(), activations)))._unsafeUnwrap();

    expect(layered[0]!.layer).toBe(someLayer());
    expect("layer" in unlayered[0]!).toBe(false);
  });

  it("returns violations in source order with ties broken by rule id", async () => {
    const engine = new Engine();
    // Reports arrive out of source order: z-rule reports the line-3
    // identifier first, then both rules report the line-2 identifier.
    engine
      .register(
        moduleOf("z-rule", (context: RuleContext) => ({
          identifier: (node) => {
            context.report({ message: "z", position: node.position });
          },
        })),
      )
      ._unsafeUnwrap();
    engine
      .register(
        moduleOf("a-rule", (context: RuleContext) => ({
          "identifier:exit": (node) => {
            context.report({ message: "a", position: node.position });
          },
        })),
      )
      ._unsafeUnwrap();

    const violations = (
      await engine.run(inputOf(declarationTree(), [activationOf("z-rule"), activationOf("a-rule")]))
    )._unsafeUnwrap();

    expect(
      violations.map((found) => `${found.ruleId}@${String(found.position.startLine)}`),
    ).toEqual(["a-rule@2", "z-rule@2", "a-rule@3", "z-rule@3"]);
  });

  it("orders same-line violations by start column, then end position", async () => {
    const engine = new Engine();
    const spans = [
      { startLine: 5, startColumn: 9, endLine: 5, endColumn: 10 },
      { startLine: 5, startColumn: 2, endLine: 6, endColumn: 1 },
      { startLine: 5, startColumn: 2, endLine: 5, endColumn: 8 },
      { startLine: 5, startColumn: 2, endLine: 5, endColumn: 3 },
    ];
    engine
      .register(
        moduleOf("spans", (context: RuleContext) => ({
          program: () => {
            for (const span of spans) {
              context.report({ message: "span", position: { file: DEFAULT_FILE, ...span } });
            }
          },
        })),
      )
      ._unsafeUnwrap();

    const violations = (
      await engine.run(inputOf(declarationTree(), [activationOf("spans")]))
    )._unsafeUnwrap();

    expect(
      violations.map(
        (found) =>
          `${String(found.position.startColumn)}→${String(found.position.endLine)}.${String(found.position.endColumn)}`,
      ),
    ).toEqual(["2→5.3", "2→5.8", "2→6.1", "9→5.10"]);
  });

  it("is deterministic: identical inputs produce identical violations, ids included", async () => {
    const engine = new Engine();
    reportEverything(engine);
    const input = inputOf(declarationTree(), [activationOf("flag-identifiers")]);

    const first = (await engine.run(input))._unsafeUnwrap();
    const second = (await engine.run(input))._unsafeUnwrap();

    expect(first).toEqual(second);
    expect(new Set(first.map((found) => found.id)).size).toBe(first.length);
  });

  it("freezes the result array and every violation in it", async () => {
    const engine = new Engine();
    reportEverything(engine);

    const violations = (
      await engine.run(inputOf(declarationTree(), [activationOf("flag-identifiers")]))
    )._unsafeUnwrap();

    expect(Object.isFrozen(violations)).toBe(true);
    for (const found of violations) {
      expect(Object.isFrozen(found)).toBe(true);
    }
  });
});

describe("filtering and registration", () => {
  it('skips activations configured "off"', async () => {
    const engine = new Engine();
    let calls = 0;
    engine
      .register(
        moduleOf("disabled", {
          "*": () => {
            calls += 1;
          },
        }),
      )
      ._unsafeUnwrap();

    const violations = (
      await engine.run(inputOf(declarationTree(), [activationOf("disabled", "off")]))
    )._unsafeUnwrap();

    expect(calls).toBe(0);
    expect(violations).toEqual([]);
  });

  it("does not run registered rules that have no activation", async () => {
    const engine = new Engine();
    let calls = 0;
    engine
      .register(
        moduleOf("dormant", {
          "*": () => {
            calls += 1;
          },
        }),
      )
      ._unsafeUnwrap();

    (await engine.run(inputOf(declarationTree(), [])))._unsafeUnwrap();

    expect(calls).toBe(0);
  });

  it("fails the run when an activation names an unregistered rule", async () => {
    const engine = new Engine();

    const result = await engine.run(inputOf(declarationTree(), [activationOf("missing-rule")]));

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(RuleExecutionError);
    expect(error.ruleId).toBe("missing-rule");
    expect(error.message).toContain("not registered");
  });

  it("rejects duplicate registration and keeps the original module", async () => {
    const engine = new Engine();
    const seen: string[] = [];
    engine
      .register(
        moduleOf("dup", {
          identifier: () => {
            seen.push("original");
          },
        }),
      )
      ._unsafeUnwrap();

    const second = engine.register(
      moduleOf("dup", {
        identifier: () => {
          seen.push("replacement");
        },
      }),
    );

    const error = second._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain('duplicate rule "dup"');
    (await engine.run(inputOf(declarationTree(), [activationOf("dup")])))._unsafeUnwrap();
    expect(seen).toEqual(["original", "original"]);
  });

  it("lists registered rules in registration order, frozen", () => {
    const engine = new Engine();
    engine.register(moduleOf("first", {}))._unsafeUnwrap();
    engine.register(moduleOf("second", {}))._unsafeUnwrap();

    const rules = engine.rules;

    expect(rules.map((rule) => rule.id)).toEqual(["first", "second"]);
    expect(Object.isFrozen(rules)).toBe(true);
  });
});

describe("containment — the run never throws", () => {
  async function expectAttributedError(
    build: (engine: Engine) => void,
    expected: { ruleId?: string; messagePart: string },
  ): Promise<RuleExecutionError> {
    const engine = new Engine();
    build(engine);
    const result = await engine.run(inputOf(declarationTree(), [activationOf("bad-rule")]));
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(RuleExecutionError);
    expect(error.ruleId).toBe(expected.ruleId ?? "bad-rule");
    expect(error.message).toContain(expected.messagePart);
    return error;
  }

  it("contains a listener throwing an Error, attributed to the rule", async () => {
    await expectAttributedError(
      (engine) => {
        engine
          .register(
            moduleOf("bad-rule", {
              identifier: () => {
                throw new RangeError("exploded");
              },
            }),
          )
          ._unsafeUnwrap();
      },
      { messagePart: "threw RangeError: exploded" },
    );
  });

  it("contains a listener throwing a string", async () => {
    await expectAttributedError(
      (engine) => {
        engine
          .register(
            moduleOf("bad-rule", {
              identifier: () => {
                // eslint-disable-next-line @typescript-eslint/only-throw-error -- containment fixture: rules may throw anything
                throw "boom";
              },
            }),
          )
          ._unsafeUnwrap();
      },
      { messagePart: "threw: boom" },
    );
  });

  it("contains a listener throwing a non-Error object", async () => {
    await expectAttributedError(
      (engine) => {
        engine
          .register(
            moduleOf("bad-rule", {
              identifier: () => {
                // eslint-disable-next-line @typescript-eslint/only-throw-error -- containment fixture: rules may throw anything
                throw { weird: true };
              },
            }),
          )
          ._unsafeUnwrap();
      },
      { messagePart: "threw a non-Error value" },
    );
  });

  it("contains a throwing create()", async () => {
    await expectAttributedError(
      (engine) => {
        engine
          .register(
            moduleOf("bad-rule", () => {
              throw new Error("create failed");
            }),
          )
          ._unsafeUnwrap();
      },
      { messagePart: "threw Error: create failed" },
    );
  });

  it("rejects an async listener as a rule failure", async () => {
    // Cast: an async listener is exactly the type misuse the engine must
    // survive at run time — the type system forbids it, rules can still do it.
    // Rejecting, not resolving: also proves the engine silences the stray
    // promise — an unhandled rejection would fail this test run.
    const asyncListener = (() =>
      Promise.reject(new Error("late failure"))) as unknown as RuleListener;
    await expectAttributedError(
      (engine) => {
        engine.register(moduleOf("bad-rule", { identifier: asyncListener }))._unsafeUnwrap();
      },
      { messagePart: "listener returned a Promise" },
    );
  });

  it("rejects an async create() as a rule failure", async () => {
    const asyncCreate = (() => Promise.resolve({})) as unknown as (
      context: RuleContext,
    ) => RuleListeners;
    await expectAttributedError(
      (engine) => {
        engine.register({ rule: ruleOf("bad-rule"), create: asyncCreate })._unsafeUnwrap();
      },
      { messagePart: "create() returned a Promise" },
    );
  });

  it.each([[""], [":exit"], ["foo:enter"], ["foo:bar"]])(
    "rejects invalid listener selector %j",
    async (selector) => {
      await expectAttributedError(
        (engine) => {
          engine
            .register(
              moduleOf("bad-rule", {
                [selector]: () => {
                  /* never dispatched */
                },
              }),
            )
            ._unsafeUnwrap();
        },
        { messagePart: `invalid listener selector "${selector}"` },
      );
    },
  );

  it("fails the run when a rule reports a position in another file", async () => {
    await expectAttributedError(
      (engine) => {
        engine
          .register(
            moduleOf("bad-rule", (context: RuleContext) => ({
              identifier: () => {
                context.report({
                  message: "wrong file",
                  position: {
                    file: someFile("src/other.ts"),
                    startLine: 1,
                    startColumn: 1,
                    endLine: 1,
                    endColumn: 2,
                  },
                });
              },
            })),
          )
          ._unsafeUnwrap();
      },
      { messagePart: 'reported a position in "src/other.ts"' },
    );
  });

  it("fails the run when a rule offers a fix targeting another file", async () => {
    // A fix is the one report field written back to disk, so a cross-file
    // range would corrupt a file the run never read (review #39 LOW-1).
    await expectAttributedError(
      (engine) => {
        engine
          .register(
            moduleOf("bad-rule", (context: RuleContext) => ({
              identifier: (node) => {
                context.report({
                  message: "fix points elsewhere",
                  position: node.position,
                  fix: {
                    position: {
                      file: someFile("src/other.ts"),
                      startLine: 1,
                      startColumn: 1,
                      endLine: 1,
                      endColumn: 2,
                    },
                    replacement: "x",
                  },
                });
              },
            })),
          )
          ._unsafeUnwrap();
      },
      { messagePart: 'offered a fix for "src/other.ts"' },
    );
  });

  it("fails the run on a report the Violation factory rejects (blank message)", async () => {
    await expectAttributedError(
      (engine) => {
        engine
          .register(
            moduleOf("bad-rule", (context: RuleContext) => ({
              identifier: (node) => {
                context.report({ message: "   ", position: node.position });
              },
            })),
          )
          ._unsafeUnwrap();
      },
      { messagePart: "reported an invalid violation" },
    );
  });

  it("contains a hostile Position getter that throws inside validation", async () => {
    const hostile = {
      file: DEFAULT_FILE,
      get startLine(): number {
        throw new Error("hostile position");
      },
      startColumn: 1,
      endLine: 1,
      endColumn: 2,
    } as Position;
    await expectAttributedError(
      (engine) => {
        engine
          .register(
            moduleOf("bad-rule", (context: RuleContext) => ({
              identifier: () => {
                context.report({ message: "looks fine", position: hostile });
              },
            })),
          )
          ._unsafeUnwrap();
      },
      { messagePart: "threw Error: hostile position" },
    );
  });

  it("contains a hostile children getter mid-walk, unattributed", async () => {
    const engine = new Engine();
    engine.register(moduleOf("innocent", {}))._unsafeUnwrap();
    const root: AstNode = Object.freeze({
      nodeType: "program",
      position: Object.freeze({
        file: DEFAULT_FILE,
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 2,
      }),
      text: "program",
      get children(): readonly AstNode[] {
        throw new Error("hostile tree");
      },
    });

    const result = await engine.run(inputOf(root, [activationOf("innocent")]));

    const error = result._unsafeUnwrapErr();
    expect(error.ruleId).toBeUndefined();
    expect(error.message).toContain("threw Error: hostile tree");
  });
});

describe("immutability", () => {
  it("hands rules a frozen context with a frozen options snapshot", async () => {
    const engine = new Engine();
    let captured: RuleContext | undefined;
    engine
      .register(
        moduleOf("inspect", (context: RuleContext) => {
          captured = context;
          return {};
        }),
      )
      ._unsafeUnwrap();

    (
      await engine.run(
        inputOf(declarationTree(), [activationOf("inspect", "warning", { max: 3 })], {
          layer: someLayer(),
        }),
      )
    )._unsafeUnwrap();

    expect(captured).toBeDefined();
    expect(Object.isFrozen(captured)).toBe(true);
    expect(Object.isFrozen(captured!.options)).toBe(true);
    expect(captured!.options).toEqual({ max: 3 });
    expect(captured!.file).toBe(DEFAULT_FILE);
    expect(captured!.language).toBe("typescript");
    expect(captured!.layer).toBe(someLayer());
  });

  it("runs to completion over fully frozen inputs (mutation anywhere would throw)", async () => {
    // Every helper-built node, the parsed file, the activations array, and
    // the input itself are frozen; strict mode turns any engine-side
    // mutation into a TypeError, so a clean run is the assertion.
    const engine = new Engine();
    engine
      .register(
        moduleOf("reporter", (context: RuleContext) => ({
          identifier: (node) => {
            context.report({ message: "found", position: node.position });
          },
        })),
      )
      ._unsafeUnwrap();

    const violations = (
      await engine.run(inputOf(declarationTree(), [activationOf("reporter")]))
    )._unsafeUnwrap();

    expect(violations).toHaveLength(2);
  });
});

describe("edges", () => {
  it("returns an empty frozen result for a run with no activations", async () => {
    const engine = new Engine();

    const violations = (await engine.run(inputOf(declarationTree(), [])))._unsafeUnwrap();

    expect(violations).toEqual([]);
    expect(Object.isFrozen(violations)).toBe(true);
  });

  it("walks a 50000-deep tree without overflowing the stack", async () => {
    const engine = new Engine();
    let count = 0;
    engine
      .register(
        moduleOf("counter", {
          "*": () => {
            count += 1;
          },
        }),
      )
      ._unsafeUnwrap();

    (await engine.run(inputOf(chainTree(50_000), [activationOf("counter")])))._unsafeUnwrap();

    expect(count).toBe(50_000);
  });

  it("dispatches across a broad synthetic tree, every node visited once", async () => {
    const engine = new Engine();
    const visited: string[] = [];
    engine
      .register(
        moduleOf("census", {
          "*": (node) => {
            visited.push(node.nodeType);
          },
        }),
      )
      ._unsafeUnwrap();
    const tree = syntheticTree(500);

    (await engine.run(inputOf(tree, [activationOf("census")])))._unsafeUnwrap();

    expect(visited).toHaveLength(500);
    expect(visited).toEqual(collectNodes(tree).map((node) => node.nodeType));
  });
});

describe("violation shape", () => {
  it("preserves message and position and stamps rule id on each violation", async () => {
    const engine = new Engine();
    engine
      .register(
        moduleOf("shape-check", (context: RuleContext) => ({
          identifier: (node) => {
            context.report({ message: `saw ${node.text}`, position: node.position });
          },
        })),
      )
      ._unsafeUnwrap();

    const violations = (
      await engine.run(inputOf(declarationTree(), [activationOf("shape-check", "info")]))
    )._unsafeUnwrap();

    const [first] = violations as readonly [Violation, ...Violation[]];
    expect(first.ruleId).toBe("shape-check");
    expect(first.message).toBe("saw x");
    expect(first.severity).toBe("info");
    expect(first.position).toMatchObject({ startLine: 2, startColumn: 5, endColumn: 6 });
    expect(first.id).toContain("shape-check");
  });
});
