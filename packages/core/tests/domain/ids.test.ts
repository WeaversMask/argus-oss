import { describe, expect, it } from "vitest";
import {
  projectId,
  scanId,
  suppressionId,
  violationId,
  type ProjectId,
} from "../../src/domain/ids.js";
import { ruleId } from "../../src/domain/rule.js";
import { ValidationError } from "../../src/errors/validation-error.js";

describe("opaque ids", () => {
  it.each([
    ["projectId", projectId],
    ["scanId", scanId],
    ["violationId", violationId],
    ["suppressionId", suppressionId],
  ])("%s accepts UUIDs, ULIDs, and slugs", (_name, factory) => {
    expect(factory("0197ff51-e6d9-7c3a-b1a0-6a7c2f9d4e21")._unsafeUnwrap()).toBe(
      "0197ff51-e6d9-7c3a-b1a0-6a7c2f9d4e21",
    );
    expect(factory("my-project")._unsafeUnwrap()).toBe("my-project");
  });

  it.each([
    ["empty", ""],
    ["inner whitespace", "a b"],
    ["surrounding whitespace", " a "],
  ])("rejects %s", (_label, value) => {
    const error = projectId(value)._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.code).toBe("core/validation");
    expect(error.message).toContain("ProjectId");
  });

  it("brands are not interchangeable across id kinds", () => {
    const takesProjectId = (id: ProjectId): ProjectId => id;
    const scan = scanId("s-1")._unsafeUnwrap();
    // @ts-expect-error — acceptance check: a ScanId must not be accepted where a ProjectId is expected
    expect(takesProjectId(scan)).toBe("s-1");
    const rule = ruleId("no-god-objects")._unsafeUnwrap();
    // @ts-expect-error — acceptance check: a RuleId must not be accepted where a ProjectId is expected
    expect(takesProjectId(rule)).toBe("no-god-objects");
    // @ts-expect-error — acceptance check: a raw string is not a ProjectId without going through the factory
    const raw: ProjectId = "raw-string";
    expect(raw).toBe("raw-string");
  });
});
