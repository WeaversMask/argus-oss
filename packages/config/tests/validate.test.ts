import { describe, expect, it } from "vitest";
import { ConfigError } from "../src/index.js";
import { validateConfigText } from "../src/index.js";

const FILE = "team/reviewtool.yaml";

function invalid(text: string): ConfigError {
  return validateConfigText(FILE, text)._unsafeUnwrapErr();
}

describe("validateConfigText", () => {
  it("returns a typed object for a valid document", () => {
    const config = validateConfigText(
      FILE,
      [
        "languages:",
        "  - typescript",
        "ignore:",
        '  - "dist/**"',
        "rules:",
        "  style/no-let: error",
        "  style/max-lines:",
        "    severity: warning",
        "    options:",
        "      max: 400",
      ].join("\n"),
    )._unsafeUnwrap();

    expect(config.languages).toEqual(["typescript"]);
    expect(config.ignore).toEqual(["dist/**"]);
    expect(config.rules).toEqual({
      "style/no-let": "error",
      "style/max-lines": { severity: "warning", options: { max: 400 } },
    });
  });

  it("treats an empty or comments-only document as an all-defaults config", () => {
    expect(validateConfigText(FILE, "")._unsafeUnwrap()).toEqual({});
    expect(validateConfigText(FILE, "# nothing here\n")._unsafeUnwrap()).toEqual({});
  });

  it('parses unquoted "off" as the string "off" (YAML 1.2 core schema, not the 1.1 boolean)', () => {
    const config = validateConfigText(FILE, "rules:\n  style/no-let: off\n")._unsafeUnwrap();
    expect(config.rules).toEqual({ "style/no-let": "off" });
  });

  it("reports YAML syntax errors with line and column", () => {
    const error = invalid("rules:\n  style/no-let: [unclosed\n");

    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain("Malformed YAML");
    expect(error.issues[0]!.file).toBe(FILE);
    expect(error.issues[0]!.line).toBeGreaterThanOrEqual(2);
  });

  it("rejects duplicate keys", () => {
    const error = invalid("ignore: []\nignore: []\n");
    expect(error.message).toContain("Malformed YAML");
  });

  it("points at the exact line and column of a bad enum value", () => {
    // "klingon" sits on line 4, column 5 (after the "- " marker).
    const error = invalid(
      ["# a comment", "languages:", "  - typescript", "  - klingon"].join("\n"),
    );

    const issue = error.issues[0]!;
    expect(issue.path).toBe("languages.1");
    expect(issue.line).toBe(4);
    expect(issue.column).toBe(5);
    expect(error.message).toContain(`${FILE}:4:5`);
  });

  it("points at the value of a bad rule severity", () => {
    const error = invalid(["rules:", "  style/no-let: severe"].join("\n"));

    const issue = error.issues[0]!;
    expect(issue.path).toBe("rules.style/no-let");
    expect(issue.line).toBe(2);
    expect(issue.column).toBe(17);
  });

  it("rejects unknown top-level keys, pointing at each stray key", () => {
    const error = invalid(
      ["languages:", "  - typescript", "rulez:", "  style/no-let: error"].join("\n"),
    );

    const issue = error.issues.find((candidate) => candidate.path === "rulez");
    expect(issue).toBeDefined();
    expect(issue!.message).toContain('unrecognized key "rulez"');
    expect(issue!.line).toBe(4); // points at the key's value block
  });

  it("rejects invalid rule ids via core's ruleId vocabulary", () => {
    const error = invalid(["rules:", '  "Bad Rule Id": error'].join("\n"));

    const issue = error.issues[0]!;
    expect(issue.path).toBe("rules.Bad Rule Id");
    expect(issue.message).toContain("invalid rule id");
    expect(issue.line).toBe(2);
  });

  it("collects every issue, not just the first", () => {
    const error = invalid(
      ["languages:", "  - klingon", "rules:", "  style/no-let: severe"].join("\n"),
    );
    expect(error.issues.length).toBeGreaterThanOrEqual(2);
  });

  it("freezes the error's issues", () => {
    const error = invalid("languages: [klingon]\n");
    expect(Object.isFrozen(error)).toBe(true);
    expect(Object.isFrozen(error.issues)).toBe(true);
    expect(Object.isFrozen(error.issues[0])).toBe(true);
  });

  it("rejects a non-object document", () => {
    const error = invalid("- just\n- a\n- list\n");
    expect(error.issues[0]!.path).toBe("");
    expect(error.issues[0]!.line).toBe(1);
  });
});
