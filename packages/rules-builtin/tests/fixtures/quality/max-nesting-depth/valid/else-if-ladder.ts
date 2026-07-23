export function grade(n: number) {
  if (n >= 90) {
    return "A";
  } else if (n >= 80) {
    return "B";
  } else if (n >= 70) {
    return "C";
  } else {
    return "F";
  }
}
