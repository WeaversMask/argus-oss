export function f(xs: number[]) {
  let total = 0;
  for (const x of xs) {
    total += x;
  }
  if (total > 0) {
    return total;
  }
  return 0;
}
