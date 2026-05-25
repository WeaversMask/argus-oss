// The upstream `Matchers<T = any>` interface in `@vitest/expect` uses `any`
// as its default type parameter. Declaration merging requires our augmentation
// to use an *identical* default, so the `any` here is load-bearing — it is
// not the matcher's logical return type. See
// node_modules/@vitest/expect/dist/index.d.ts → `interface Matchers<T = any>`.

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Matchers<T = any> {
    toBeNonEmpty(): T;
  }
}

export {};
