export function f(a: boolean, xs: number[]) {
  if (a)
    for (const x of xs)
      if (x > 0)
        if (x > 1) {
          return x;
        }
  return 0;
}
