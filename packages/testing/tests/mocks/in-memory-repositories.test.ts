import { RepositoryError, startScan, timestamp } from "@argus/core";
import { describe, expect, it } from "vitest";
import { InMemoryProjectRepository } from "../../src/mocks/in-memory-project-repository.js";
import { InMemoryScanRepository } from "../../src/mocks/in-memory-scan-repository.js";
import { InMemorySuppressionRepository } from "../../src/mocks/in-memory-suppression-repository.js";
import { InMemoryViolationRepository } from "../../src/mocks/in-memory-violation-repository.js";
import {
  someProject,
  someProjectId,
  someQueuedScan,
  someScanId,
  someSuppression,
  someViolation,
} from "./helpers.js";

const boom = () => new RepositoryError("save", "connection lost");

describe("InMemoryScanRepository", () => {
  it("round-trips a scan and reads absence as undefined", async () => {
    const repo = new InMemoryScanRepository();
    const scan = someQueuedScan();
    (await repo.save(scan))._unsafeUnwrap();
    expect((await repo.findById(scan.id))._unsafeUnwrap()).toBe(scan);
    expect((await repo.findById(someScanId("scan-404")))._unsafeUnwrap()).toBeUndefined();
  });

  it("upserts by id — the latest lifecycle state wins", async () => {
    const repo = new InMemoryScanRepository();
    const queued = someQueuedScan();
    const running = startScan(queued, timestamp(1_500)._unsafeUnwrap())._unsafeUnwrap();
    (await repo.save(queued))._unsafeUnwrap();
    (await repo.save(running))._unsafeUnwrap();
    expect((await repo.findById(queued.id))._unsafeUnwrap()).toBe(running);
  });

  it("findByProject filters and keeps first-save order, frozen", async () => {
    const repo = new InMemoryScanRepository();
    const first = someQueuedScan("scan-1", "argus");
    const other = someQueuedScan("scan-2", "elsewhere");
    const second = someQueuedScan("scan-3", "argus");
    for (const scan of [first, other, second]) {
      (await repo.save(scan))._unsafeUnwrap();
    }
    const scans = (await repo.findByProject(someProjectId("argus")))._unsafeUnwrap();
    expect(scans).toEqual([first, second]);
    expect(Object.isFrozen(scans)).toBe(true);
  });

  it("failNextWith fails exactly the next operation", async () => {
    const repo = new InMemoryScanRepository();
    const error = boom();
    repo.failNextWith(error);
    expect((await repo.save(someQueuedScan()))._unsafeUnwrapErr()).toBe(error);
    (await repo.save(someQueuedScan()))._unsafeUnwrap();
    repo.failNextWith(error);
    expect((await repo.findById(someScanId()))._unsafeUnwrapErr()).toBe(error);
    repo.failNextWith(error);
    expect((await repo.findByProject(someProjectId()))._unsafeUnwrapErr()).toBe(error);
  });
});

describe("InMemoryProjectRepository", () => {
  it("round-trips, lists in first-save order, and upserts renames in place", async () => {
    const repo = new InMemoryProjectRepository();
    const argus = someProject("argus", "Argus");
    const other = someProject("other", "Other");
    (await repo.save(argus))._unsafeUnwrap();
    (await repo.save(other))._unsafeUnwrap();
    (await repo.save({ ...argus, name: "Argus OSS" }))._unsafeUnwrap();
    expect((await repo.findById(argus.id))._unsafeUnwrap()?.name).toBe("Argus OSS");
    const listed = (await repo.list())._unsafeUnwrap();
    expect(listed.map((project) => project.name)).toEqual(["Argus OSS", "Other"]);
    expect(Object.isFrozen(listed)).toBe(true);
    expect((await repo.findById(someProjectId("nope")))._unsafeUnwrap()).toBeUndefined();
  });

  it("failNextWith fails exactly the next operation", async () => {
    const repo = new InMemoryProjectRepository();
    const error = boom();
    repo.failNextWith(error);
    expect((await repo.save(someProject()))._unsafeUnwrapErr()).toBe(error);
    repo.failNextWith(error);
    expect((await repo.findById(someProjectId()))._unsafeUnwrapErr()).toBe(error);
    repo.failNextWith(error);
    expect((await repo.list())._unsafeUnwrapErr()).toBe(error);
  });
});

describe("InMemoryViolationRepository", () => {
  it("saveForScan replaces the set; unknown scans read as empty", async () => {
    const repo = new InMemoryViolationRepository();
    const scanId = someScanId();
    (await repo.saveForScan(scanId, [someViolation("v-1"), someViolation("v-2")]))._unsafeUnwrap();
    (await repo.saveForScan(scanId, [someViolation("v-3")]))._unsafeUnwrap();
    const violations = (await repo.findByScan(scanId))._unsafeUnwrap();
    expect(violations.map((entry) => entry.id)).toEqual(["v-3"]);
    expect(Object.isFrozen(violations)).toBe(true);
    expect((await repo.findByScan(someScanId("scan-404")))._unsafeUnwrap()).toEqual([]);
  });

  it("failNextWith fails exactly the next operation", async () => {
    const repo = new InMemoryViolationRepository();
    const error = boom();
    repo.failNextWith(error);
    expect((await repo.saveForScan(someScanId(), []))._unsafeUnwrapErr()).toBe(error);
    repo.failNextWith(error);
    expect((await repo.findByScan(someScanId()))._unsafeUnwrapErr()).toBe(error);
  });
});

describe("InMemorySuppressionRepository", () => {
  it("scopes by project with replace semantics (D-4a)", async () => {
    const repo = new InMemorySuppressionRepository();
    const argus = someProjectId("argus");
    (await repo.saveForProject(argus, [someSuppression("s-1")]))._unsafeUnwrap();
    (await repo.saveForProject(argus, [someSuppression("s-2")]))._unsafeUnwrap();
    const suppressions = (await repo.findForProject(argus))._unsafeUnwrap();
    expect(suppressions.map((entry) => entry.id)).toEqual(["s-2"]);
    expect(Object.isFrozen(suppressions)).toBe(true);
    expect((await repo.findForProject(someProjectId("other")))._unsafeUnwrap()).toEqual([]);
  });

  it("failNextWith fails exactly the next operation", async () => {
    const repo = new InMemorySuppressionRepository();
    const error = boom();
    repo.failNextWith(error);
    expect((await repo.saveForProject(someProjectId(), []))._unsafeUnwrapErr()).toBe(error);
    repo.failNextWith(error);
    expect((await repo.findForProject(someProjectId()))._unsafeUnwrapErr()).toBe(error);
  });
});
