export function f(xs: number[]) {
  for (const x of xs) {
    if (x > 0) {
      switch (x) {
        case 1:
          return 1;
        default:
          return 0;
      }
    }
  }
}
