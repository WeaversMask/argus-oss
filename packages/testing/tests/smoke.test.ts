import { describe, expect, it } from "vitest";

import { defineProjectConfig, fakeSecret, toBeNonEmpty } from "../src/index.js";

describe("@argus/testing — toBeNonEmpty matcher", () => {
  it("passes for non-empty strings, arrays, objects, Sets, and Maps", () => {
    expect("hello").toBeNonEmpty();
    expect([1]).toBeNonEmpty();
    expect({ a: 1 }).toBeNonEmpty();
    expect(new Set([1])).toBeNonEmpty();
    expect(new Map([["k", "v"]])).toBeNonEmpty();
  });

  it("fails for empty containers, nullish values, and primitives", () => {
    expect("").not.toBeNonEmpty();
    expect([]).not.toBeNonEmpty();
    expect({}).not.toBeNonEmpty();
    expect(new Set()).not.toBeNonEmpty();
    expect(new Map()).not.toBeNonEmpty();
    expect(null).not.toBeNonEmpty();
    expect(undefined).not.toBeNonEmpty();
    expect(0).not.toBeNonEmpty();
  });

  it("re-exports the matcher as a callable for direct use", () => {
    expect(typeof toBeNonEmpty).toBe("function");
  });

  it("renders a failure message that names the received value", () => {
    expect(() => {
      expect("").toBeNonEmpty();
    }).toThrowError(/to be non-empty/);

    expect(() => {
      expect("hello").not.toBeNonEmpty();
    }).toThrowError(/not to be non-empty/);
  });
});

describe("@argus/testing — fakeSecret", () => {
  it("produces allow-listed fake secrets for each known kind", () => {
    expect(fakeSecret("aws-access-key").startsWith("AKIA-FAKE-TEST-FIXTURE-")).toBe(true);
    expect(fakeSecret("github-token").startsWith("ghp_FAKE_TEST_FIXTURE_")).toBe(true);
    expect(fakeSecret("generic-api-key").startsWith("argus_fake_test_fixture_")).toBe(true);
  });

  it("is deterministic for the same seed and varies for different seeds", () => {
    expect(fakeSecret("aws-access-key", "ABC")).toBe(fakeSecret("aws-access-key", "ABC"));
    expect(fakeSecret("aws-access-key", "ABC")).not.toBe(fakeSecret("aws-access-key", "DEF"));
  });

  it("truncates seeds longer than the kind's filler length", () => {
    const longSeed = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const aws = fakeSecret("aws-access-key", longSeed);
    expect(aws).toBe("AKIA-FAKE-TEST-FIXTURE-ABCDEFGHIJKLMNOP");
  });
});

describe("@argus/testing — defineProjectConfig", () => {
  it("returns a Vitest config with the shared coverage thresholds", () => {
    const config = defineProjectConfig();
    expect(config.test?.coverage).toMatchObject({
      provider: "v8",
      thresholds: { lines: 85, branches: 80 },
    });
  });

  it("merges per-package overrides without dropping the defaults", () => {
    const config = defineProjectConfig({
      test: { name: "pkg-under-test", environment: "jsdom" },
    });
    expect(config.test?.name).toBe("pkg-under-test");
    expect(config.test?.environment).toBe("jsdom");
    expect(config.test?.coverage).toMatchObject({ provider: "v8" });
  });
});
