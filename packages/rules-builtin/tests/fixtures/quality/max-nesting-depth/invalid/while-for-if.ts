export function f(a: number, xs: number[]) {
  while (a > 0) {
    for (const x of xs) {
      if (x) {
        a -= x;
      }
    }
  }
}
