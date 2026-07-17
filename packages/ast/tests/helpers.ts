import { filePath } from "@argus/core";
import type { AstNode, FilePath, Language, ParsedFile } from "@argus/core";
import { TreeSitterAstParser } from "../src/index.js";

/** One parser per test file: engine + grammar loads are cached across tests. */
export const sharedParser = new TreeSitterAstParser();

export function someFile(value = "tests/fixture.src"): FilePath {
  return filePath(value)._unsafeUnwrap();
}

export async function parseOk(
  source: string,
  language: Language = "typescript",
): Promise<ParsedFile> {
  const result = await sharedParser.parse(someFile(), source, language);
  return result._unsafeUnwrap();
}

/**
 * Recursive pre-order collector, deliberately independent of `visit` so the
 * two can cross-check each other.
 */
export function collectNodes(root: AstNode): AstNode[] {
  const acc: AstNode[] = [];
  const walk = (node: AstNode): void => {
    acc.push(node);
    node.children.forEach(walk);
  };
  walk(root);
  return acc;
}

export const TS_FIXTURE = `interface Shape {
  readonly sides: number;
}

export function area(shape: Shape, scale = 1): number {
  return shape.sides * scale;
}

const label: string | undefined = ["a", "b"].find((s) => s === "a")?.toUpperCase();

export class Circle implements Shape {
  readonly sides = 0;
  constructor(private readonly radius: number) {}
  describe(): string {
    return \`r=\${this.radius} \${label ?? ""}\`;
  }
}
`;

export const JS_FIXTURE = `export async function fetchAll(urls) {
  const results = await Promise.all(urls.map((u) => fetch(u)));
  return [...results];
}

class Registry extends Map {
  register(name, value = {}) {
    this.set(name, { ...value, name });
    return \`registered \${name}\`;
  }
}

export default new Registry();
`;

export const PY_FIXTURE = `from dataclasses import dataclass


@dataclass
class Point:
    x: int
    y: int

    def scaled(self, factor: int = 2) -> "Point":
        return Point(self.x * factor, self.y * factor)


def total(points: list[Point]) -> int:
    return sum(p.x + p.y for p in points)


if __name__ == "__main__":
    print(f"total: {total([Point(1, 2)])}")
`;
