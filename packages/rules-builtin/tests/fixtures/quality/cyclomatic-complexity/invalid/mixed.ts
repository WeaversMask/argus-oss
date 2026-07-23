export function f(xs: number[]) {
  for (const x of xs) {
    if (x > 0) {
      while (x > 10) {
        x -= 1;
      }
    }
  }
  try {
    return xs.length;
  } catch (e) {
    return 0;
  }
}
