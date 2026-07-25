import { describe, expect, it } from "vitest";
import { SEVERITIES } from "@argus/core";
import { shouldUseColour, stylesFor } from "../../src/formatters/colour.js";

/** Built here rather than written as a literal so no control char enters source. */
const ESC = String.fromCharCode(27);

describe("shouldUseColour", () => {
  it("follows stdout when nothing else has an opinion", () => {
    expect(shouldUseColour({ env: {}, isTTY: true })).toBe(true);
    expect(shouldUseColour({ env: {}, isTTY: false })).toBe(false);
  });

  it("honours --no-color above every other signal", () => {
    const forced = { FORCE_COLOR: "1" };
    expect(shouldUseColour({ env: forced, isTTY: true, allowed: false })).toBe(false);
    expect(shouldUseColour({ env: forced, isTTY: true, allowed: true })).toBe(true);
  });

  it("disables colour when NO_COLOR is set to any non-empty value", () => {
    expect(shouldUseColour({ env: { NO_COLOR: "1" }, isTTY: true })).toBe(false);
    expect(shouldUseColour({ env: { NO_COLOR: "0" }, isTTY: true })).toBe(false);
  });

  it("treats an empty NO_COLOR as unset, per no-color.org", () => {
    expect(shouldUseColour({ env: { NO_COLOR: "" }, isTTY: true })).toBe(true);
    expect(shouldUseColour({ env: { NO_COLOR: "" }, isTTY: false })).toBe(false);
  });

  it("lets FORCE_COLOR override a redirected stdout and a global NO_COLOR", () => {
    expect(shouldUseColour({ env: { FORCE_COLOR: "1" }, isTTY: false })).toBe(true);
    expect(shouldUseColour({ env: { FORCE_COLOR: "1", NO_COLOR: "1" }, isTTY: false })).toBe(true);
  });

  it("ignores FORCE_COLOR when it is empty or explicitly 0", () => {
    expect(shouldUseColour({ env: { FORCE_COLOR: "" }, isTTY: false })).toBe(false);
    expect(shouldUseColour({ env: { FORCE_COLOR: "0" }, isTTY: true })).toBe(true);
    expect(shouldUseColour({ env: { FORCE_COLOR: "0", NO_COLOR: "1" }, isTTY: true })).toBe(false);
  });

  it("respects a terminal that cannot render escapes", () => {
    expect(shouldUseColour({ env: { TERM: "dumb" }, isTTY: true })).toBe(false);
    expect(shouldUseColour({ env: { TERM: "xterm-256color" }, isTTY: true })).toBe(true);
    // An explicit request still wins: the user knows where the output is going.
    expect(shouldUseColour({ env: { TERM: "dumb", FORCE_COLOR: "1" }, isTTY: true })).toBe(true);
  });
});

describe("stylesFor", () => {
  it("is the identity in every role when colour is off", () => {
    const styles = stylesFor(false);
    expect(styles.path("x")).toBe("x");
    expect(styles.location("1:1")).toBe("1:1");
    expect(styles.ruleId("a/b")).toBe("a/b");
    expect(styles.clean("ok")).toBe("ok");
    expect(styles.failure("bad")).toBe("bad");
    for (const severity of SEVERITIES) {
      expect(styles.severity(severity)("s")).toBe("s");
    }
  });

  it("wraps text in SGR sequences that always reset when colour is on", () => {
    const styles = stylesFor(true);
    expect(styles.path("x")).toBe(`${ESC}[1mx${ESC}[0m`);
    expect(styles.location("1:1")).toBe(`${ESC}[2m1:1${ESC}[0m`);
    expect(styles.clean("ok")).toBe(`${ESC}[32mok${ESC}[0m`);
  });

  it("gives each severity its own base-palette colour, worst one louder", () => {
    const styles = stylesFor(true);
    const codes = SEVERITIES.map((severity) => styles.severity(severity)("s"));
    expect(codes).toStrictEqual([
      `${ESC}[36ms${ESC}[0m`,
      `${ESC}[33ms${ESC}[0m`,
      `${ESC}[31ms${ESC}[0m`,
      `${ESC}[1;31ms${ESC}[0m`,
    ]);
    // Every severity is visually distinct — no two share a rendering.
    expect(new Set(codes).size).toBe(SEVERITIES.length);
  });
});
