import { describe, expect, it } from "vitest";
import { suppressionId } from "../../src/domain/ids.js";
import { ruleId } from "../../src/domain/rule.js";
import {
  isSuppressionExpired,
  suppression,
  type Suppression,
} from "../../src/domain/suppression.js";
import { someTimestamp } from "../fixtures.js";

const createdAt = someTimestamp(1_000);

const base: Suppression = {
  id: suppressionId("sup-1")._unsafeUnwrap(),
  ruleId: ruleId("no-deep-nesting")._unsafeUnwrap(),
  pathPattern: "legacy/**",
  reason: "Legacy tree scheduled for removal in Q3 — tracked in TICKET-123.",
  createdAt,
};

describe("suppression", () => {
  it("accepts a permanent suppression (no expiry) and freezes it", () => {
    const result = suppression(base)._unsafeUnwrap();
    expect(result).toEqual(base);
    expect("expiresAt" in result).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("accepts an expiry strictly after creation", () => {
    const result = suppression({ ...base, expiresAt: someTimestamp(2_000) })._unsafeUnwrap();
    expect(result.expiresAt).toBe(2_000);
  });

  it.each([
    ["equal to createdAt", 1_000],
    ["before createdAt", 999],
  ])("rejects an expiry %s", (_label, expiresAtMs) => {
    const error = suppression({
      ...base,
      expiresAt: someTimestamp(expiresAtMs),
    })._unsafeUnwrapErr();
    expect(error.issues).toEqual([{ path: "expiresAt", message: "must be after createdAt" }]);
  });

  it.each([
    ["reason", { ...base, reason: " " }],
    ["pathPattern", { ...base, pathPattern: "" }],
  ])("rejects a blank %s — silent suppression is forbidden", (field, input) => {
    expect(
      suppression(input)
        ._unsafeUnwrapErr()
        .issues.map((issue) => issue.path),
    ).toEqual([field]);
  });
});

describe("isSuppressionExpired", () => {
  const permanent = suppression(base)._unsafeUnwrap();
  const expiring = suppression({ ...base, expiresAt: someTimestamp(2_000) })._unsafeUnwrap();

  it("a suppression without expiry never expires", () => {
    expect(isSuppressionExpired(permanent, someTimestamp(9_999_999))).toBe(false);
  });

  it("is inclusive at the expiry instant", () => {
    expect(isSuppressionExpired(expiring, someTimestamp(1_999))).toBe(false);
    expect(isSuppressionExpired(expiring, someTimestamp(2_000))).toBe(true);
    expect(isSuppressionExpired(expiring, someTimestamp(2_001))).toBe(true);
  });
});
