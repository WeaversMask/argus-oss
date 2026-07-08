import { describe, expect, it } from "vitest";
import { filePath } from "../../src/domain/file-path.js";
import { ruleId } from "../../src/domain/rule.js";
import { DomainError } from "../../src/errors/domain-error.js";
import { NotificationError } from "../../src/errors/notification-error.js";
import { ParseError } from "../../src/errors/parse-error.js";
import { RepositoryError } from "../../src/errors/repository-error.js";
import { ResolutionError } from "../../src/errors/resolution-error.js";
import { RuleExecutionError } from "../../src/errors/rule-execution-error.js";
import { ToolExecutionError } from "../../src/errors/tool-execution-error.js";

const file = () => filePath("src/example.ts")._unsafeUnwrap();

describe("port errors", () => {
  it.each([
    ["core/parse", () => new ParseError(file(), "unrepresentable input")],
    ["core/rule-execution", () => new RuleExecutionError("engine crashed")],
    ["core/tool-execution", () => new ToolExecutionError("jscpd", "exit code 2")],
    ["core/resolution", () => new ResolutionError(file(), "unreadable")],
    ["core/repository", () => new RepositoryError("save", "connection lost")],
    ["core/notification", () => new NotificationError("webhook 503")],
  ])("%s is a frozen DomainError carrying its context in the message", (code, build) => {
    const error = build();
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(code);
    expect(Object.isFrozen(error)).toBe(true);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it("ParseError and ResolutionError expose the offending file", () => {
    expect(new ParseError(file(), "x").file).toBe("src/example.ts");
    expect(new ResolutionError(file(), "x").file).toBe("src/example.ts");
  });

  it("ToolExecutionError and RepositoryError expose tool and operation", () => {
    expect(new ToolExecutionError("jscpd", "x").tool).toBe("jscpd");
    expect(new RepositoryError("findById", "x").operation).toBe("findById");
  });

  it("RuleExecutionError names the rule when one is attributable, absent otherwise", () => {
    const withRule = new RuleExecutionError("threw", ruleId("no-deep-nesting")._unsafeUnwrap());
    expect(withRule.ruleId).toBe("no-deep-nesting");
    expect(withRule.message).toContain('Rule "no-deep-nesting"');
    const wholesale = new RuleExecutionError("engine crashed");
    expect("ruleId" in wholesale).toBe(false);
    expect(wholesale.message).toContain("Rule run:");
  });
});
