export function f(a: number | undefined, b: number, c: number) {
  a ??= b;
  a ||= c;
  a &&= b;
  return a;
}
