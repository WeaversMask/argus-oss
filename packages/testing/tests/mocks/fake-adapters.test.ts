import {
  finding,
  ParseError,
  ResolutionError,
  RuleExecutionError,
  ToolExecutionError,
  type RuleRunInput,
} from "@argus/core";
import { describe, expect, it } from "vitest";
import { FakeAstParser } from "../../src/mocks/fake-ast-parser.js";
import { FakeDependencyResolver } from "../../src/mocks/fake-dependency-resolver.js";
import { FakeRuleRunner } from "../../src/mocks/fake-rule-runner.js";
import { FakeToolAdapter } from "../../src/mocks/fake-tool-adapter.js";
import { someFilePath, someParsedFile, somePosition, someViolation } from "./helpers.js";

describe("FakeAstParser", () => {
  it("returns primed trees and defaults to all launch languages, frozen", async () => {
    const parser = new FakeAstParser();
    expect(parser.languages).toEqual(["typescript", "javascript", "python"]);
    expect(Object.isFrozen(parser.languages)).toBe(true);
    const parsed = someParsedFile();
    parser.primeParse(parsed);
    expect((await parser.parse(parsed.file, "const x = 1;", "typescript"))._unsafeUnwrap()).toBe(
      parsed,
    );
  });

  it("narrows to constructor-given languages", () => {
    expect(new FakeAstParser(["python"]).languages).toEqual(["python"]);
  });

  it("throws on an unprimed file — a test-setup bug should fail loudly", async () => {
    const parser = new FakeAstParser();
    await expect(parser.parse(someFilePath("src/unknown.ts"), "", "typescript")).rejects.toThrow(
      /no response primed/,
    );
  });

  it("throws on a language outside its configured set — enforcing the port's language clause", async () => {
    const parser = new FakeAstParser(["python"]);
    await expect(parser.parse(someFilePath(), "", "typescript")).rejects.toThrow(
      /outside this fake's languages/,
    );
  });

  it("failNextWith fails exactly the next parse", async () => {
    const parser = new FakeAstParser();
    const parsed = someParsedFile();
    parser.primeParse(parsed);
    const error = new ParseError(parsed.file, "unrepresentable");
    parser.failNextWith(error);
    expect((await parser.parse(parsed.file, "", "typescript"))._unsafeUnwrapErr()).toBe(error);
    expect((await parser.parse(parsed.file, "", "typescript")).isOk()).toBe(true);
  });
});

describe("FakeRuleRunner", () => {
  const input = (): RuleRunInput => ({ parsed: someParsedFile(), activations: [] });

  it("returns [] until primed, then the primed violations, recording runs", async () => {
    const runner = new FakeRuleRunner();
    expect((await runner.run(input()))._unsafeUnwrap()).toEqual([]);
    const violations = [someViolation()];
    runner.respondWith(violations);
    const returned = (await runner.run(input()))._unsafeUnwrap();
    expect(returned).toEqual(violations);
    expect(Object.isFrozen(returned)).toBe(true);
    expect(runner.runs).toHaveLength(2);
  });

  it("failNextWith fails exactly the next run and still records it", async () => {
    const runner = new FakeRuleRunner();
    const error = new RuleExecutionError("engine crashed");
    runner.failNextWith(error);
    expect((await runner.run(input()))._unsafeUnwrapErr()).toBe(error);
    expect((await runner.run(input())).isOk()).toBe(true);
    expect(runner.runs).toHaveLength(2);
  });
});

describe("FakeToolAdapter", () => {
  const target = () => ({ projectRoot: someFilePath("/repos/argus"), files: [] });

  it("names its tool (defaulting to fake-tool) and returns primed findings, recording targets", async () => {
    expect(new FakeToolAdapter().tool).toBe("fake-tool");
    const adapter = new FakeToolAdapter("jscpd");
    expect(adapter.tool).toBe("jscpd");
    expect((await adapter.execute(target()))._unsafeUnwrap()).toEqual([]);
    const findings = [
      finding({
        tool: "jscpd",
        externalRuleId: "duplicate-code",
        message: "12 duplicated lines",
        position: somePosition(),
      })._unsafeUnwrap(),
    ];
    adapter.respondWith(findings);
    expect((await adapter.execute(target()))._unsafeUnwrap()).toEqual(findings);
    expect(adapter.executions).toHaveLength(2);
  });

  it("failNextWith fails exactly the next execution", async () => {
    const adapter = new FakeToolAdapter();
    const error = new ToolExecutionError("fake-tool", "exit code 2");
    adapter.failNextWith(error);
    expect((await adapter.execute(target()))._unsafeUnwrapErr()).toBe(error);
    expect((await adapter.execute(target())).isOk()).toBe(true);
  });
});

describe("FakeDependencyResolver", () => {
  it("resolves unprimed files to no imports and primed files to their edges, frozen", async () => {
    const resolver = new FakeDependencyResolver();
    const file = someFilePath("src/a.ts");
    expect((await resolver.resolve(file, ""))._unsafeUnwrap()).toEqual({ file, imports: [] });
    const imported = someFilePath("src/b.ts");
    resolver.prime(file, [imported]);
    const resolved = (await resolver.resolve(file, ""))._unsafeUnwrap();
    expect(resolved.imports).toEqual([imported]);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.imports)).toBe(true);
  });

  it("failNextWith fails exactly the next resolve", async () => {
    const resolver = new FakeDependencyResolver();
    const file = someFilePath("src/a.ts");
    const error = new ResolutionError(file, "unreadable");
    resolver.failNextWith(error);
    expect((await resolver.resolve(file, ""))._unsafeUnwrapErr()).toBe(error);
    expect((await resolver.resolve(file, "")).isOk()).toBe(true);
  });
});
