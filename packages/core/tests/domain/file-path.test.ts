import { describe, expect, it } from "vitest";
import { filePath } from "../../src/domain/file-path.js";

describe("filePath", () => {
  it("accepts relative and absolute paths, including ones with spaces inside", () => {
    expect(filePath("src/domain/scan.ts")._unsafeUnwrap()).toBe("src/domain/scan.ts");
    expect(filePath("/abs/path/My Project/file.py")._unsafeUnwrap()).toBe(
      "/abs/path/My Project/file.py",
    );
  });

  it.each([
    ["empty string", ""],
    ["leading whitespace", " src/a.ts"],
    ["trailing whitespace", "src/a.ts "],
    ["NUL byte", "src/a\0b.ts"],
  ])("rejects %s", (_label, value) => {
    const error = filePath(value)._unsafeUnwrapErr();
    expect(error.message).toContain("FilePath");
  });
});
