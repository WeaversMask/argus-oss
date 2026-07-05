import { describe, expect, it } from "vitest";
import { projectId } from "../../src/domain/ids.js";
import { project, renameProject, type Project } from "../../src/domain/project.js";
import { someFilePath } from "../fixtures.js";

const base: Project = {
  id: projectId("argus")._unsafeUnwrap(),
  name: "Argus",
  rootPath: someFilePath("/home/dev/argus"),
};

describe("project", () => {
  it("accepts a project and freezes it", () => {
    const result = project(base)._unsafeUnwrap();
    expect(result).toEqual(base);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects a blank name", () => {
    const error = project({ ...base, name: " " })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual(["name"]);
  });
});

describe("renameProject", () => {
  it("returns a new instance and leaves the original untouched", () => {
    const original = project(base)._unsafeUnwrap();
    const renamed = renameProject(original, "Argus OSS")._unsafeUnwrap();
    expect(renamed.name).toBe("Argus OSS");
    expect(renamed).not.toBe(original);
    expect(original.name).toBe("Argus");
  });

  it("validates the new name", () => {
    const original = project(base)._unsafeUnwrap();
    expect(renameProject(original, "").isErr()).toBe(true);
  });
});
