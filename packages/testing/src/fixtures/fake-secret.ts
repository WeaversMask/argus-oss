const SECRET_KINDS = {
  "aws-access-key": { prefix: "AKIA-FAKE-TEST-FIXTURE-", length: 16 },
  "github-token": { prefix: "ghp_FAKE_TEST_FIXTURE_", length: 36 },
  "generic-api-key": { prefix: "argus_fake_test_fixture_", length: 32 },
} as const;

export type FakeSecretKind = keyof typeof SECRET_KINDS;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Produce a deterministic, obviously-fake secret-shaped string for use in
 * test fixtures. The output is allow-listed in `.gitleaks.toml` so it
 * never trips the secret scanner.
 *
 * @param kind  One of {@link FakeSecretKind}.
 * @param seed  Optional deterministic suffix. Same seed → same output.
 *              When omitted, a stable "NEVERREAL01" placeholder is used.
 */
export function fakeSecret(kind: FakeSecretKind, seed = "NEVERREAL01"): string {
  const spec = SECRET_KINDS[kind];
  const filler = stretch(seed, spec.length);
  return `${spec.prefix}${filler}`;
}

function stretch(seed: string, length: number): string {
  if (seed.length >= length) return seed.slice(0, length).toUpperCase();
  let out = seed.toUpperCase();
  let i = 0;
  while (out.length < length) {
    const idx = (seed.charCodeAt(i % seed.length) + i) % ALPHABET.length;
    out += ALPHABET[idx];
    i += 1;
  }
  return out;
}
