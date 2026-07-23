export function f(xs: number[]) {
  for (const x of xs) {
    if (x > 0) {
      break;
    }
  }
}
