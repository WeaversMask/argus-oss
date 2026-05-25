import { expect } from "vitest";

import { toBeNonEmpty } from "./matchers/to-be-non-empty.js";

import "./matchers/types.js";

expect.extend({ toBeNonEmpty });
