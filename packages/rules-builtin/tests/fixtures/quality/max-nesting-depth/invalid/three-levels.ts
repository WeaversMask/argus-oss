export function f(xs: number[]) {
  if (xs.length) {
    for (const x of xs) {
      while (x > 0) {
        break;
      }
    }
  }
}
