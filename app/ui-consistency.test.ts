import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("shared surface materials", () => {
  it.each([".neu-panel", ".neu-raised", ".neu-inset"])(
    "keeps %s defaults below theme and state utilities in the cascade",
    (selector) => {
      const componentLayer = globalsCss.match(/@layer components\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
      expect(componentLayer).toContain(selector);
    },
  );
});
