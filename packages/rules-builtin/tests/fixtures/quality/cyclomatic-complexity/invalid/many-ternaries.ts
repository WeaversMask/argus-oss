export function f(a: number) {
  const b = a > 0 ? 1 : 2;
  const c = a > 1 ? 3 : 4;
  const d = a > 2 ? 5 : 6;
  return b + c + d;
}
