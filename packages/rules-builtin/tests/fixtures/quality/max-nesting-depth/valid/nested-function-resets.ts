export function outer(xs: number[]) {
  if (xs.length > 0) {
    const inner = (ys: number[]) => {
      for (const y of ys) {
        if (y > 0) {
          return y;
        }
      }
      return 0;
    };
    return inner(xs);
  }
  return 0;
}
