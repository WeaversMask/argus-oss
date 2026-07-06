import { describe, expect, it } from "vitest";
import { violationId } from "../../src/domain/ids.js";
import { layerName } from "../../src/domain/layer.js";
import { ruleId } from "../../src/domain/rule.js";
import { violation, type Violation } from "../../src/domain/violation.js";
import { somePosition } from "../fixtures.js";

const base: Violation = {
  id: violationId("v-42")._unsafeUnwrap(),
  ruleId: ruleId("no-deep-nesting")._unsafeUnwrap(),
  severity: "warning",
  message: "Nesting depth 6 exceeds the maximum of 4",
  position: somePosition(),
};

describe("violation", () => {
  it("accepts a violation without a layer and leaves the key absent", () => {
    const result = violation(base)._unsafeUnwrap();
    expect(result).toEqual(base);
    expect("layer" in result).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("keeps the layer when the file was classified", () => {
    const withLayer = violation({ ...base, layer: layerName("domain")._unsafeUnwrap() });
    expect(withLayer._unsafeUnwrap().layer).toBe("domain");
  });

  it("rejects a blank message", () => {
    const error = violation({ ...base, message: "  " })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual(["message"]);
  });
});
