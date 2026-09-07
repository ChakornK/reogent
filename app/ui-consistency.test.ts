import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const uiFiles = ["app", "src/components"].flatMap((root) => {
  const directory = join(projectRoot, root);
  return readdirSync(directory, { recursive: true })
    .filter((file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"))
    .map((file) => ({
      path: relative(projectRoot, join(directory, file)).replaceAll("\\", "/"),
      source: readFileSync(join(directory, file), "utf8"),
    }));
});

describe("shared UI ownership", () => {
  it("uses the same body metrics for inherited text and explicit controls", () => {
    expect(globalsCss).toContain("font-size: var(--text-sm);");
    expect(globalsCss).toContain("line-height: var(--text-sm--line-height);");
  });

  it("uses shared application heading roles outside marketing and the standalone crash fallback", () => {
    const copies = uiFiles.filter(
      ({ path, source }) =>
        path !== "app/global-error.tsx" &&
        !path.startsWith("src/components/landing/") &&
        /<(?:motion\.)?h[1-6]\b/.test(source),
    );
    expect(copies.map(({ path }) => path)).toEqual([]);
  });

  it("keeps raised action styling in Button and documented specialized controls", () => {
    const owners = new Set([
      "src/components/ui/button.tsx",
      "src/components/schedule/avatar-picker.tsx",
      "src/components/schedule/upload-dropzone.tsx",
      "src/components/landing/product-mock.tsx",
    ]);
    const copies = uiFiles.filter(
      ({ path, source }) => !owners.has(path) && /\bneu-(?:primary-)?button\b/.test(source),
    );
    expect(copies.map(({ path }) => path)).toEqual([]);
  });
});

describe("shared surface materials", () => {
  it.each([".neu-panel", ".neu-raised", ".neu-inset"])(
    "keeps %s defaults below theme and state utilities in the cascade",
    (selector) => {
      const componentLayer = globalsCss.match(/@layer components\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
      expect(componentLayer).toContain(selector);
    },
  );
});
