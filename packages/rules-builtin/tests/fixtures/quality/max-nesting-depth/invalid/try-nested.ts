export function f(xs: number[]) {
  try {
    for (const x of xs) {
      if (x < 0) {
        throw new Error("neg");
      }
    }
  } catch (e) {
    return -1;
  }
}
