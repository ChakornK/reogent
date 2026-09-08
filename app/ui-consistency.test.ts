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
  it("disables transitions in reduced motion so positioned popovers can receive focus", () => {
    const reducedMotion =
      globalsCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*,([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(reducedMotion).toContain("transition-duration: 0s !important;");
  });

  it("disables native details pseudo-element transitions under reduced motion", () => {
    expect(globalsCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*details::details-content\s*\{\s*transition: none;/,
    );
  });

  it("does not delay account popup visibility before initial focus", () => {
    const profileSurface = globalsCss.match(/\.profile-menu-surface\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(profileSurface).not.toContain("visibility");
  });

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

describe("mobile workspace framing", () => {
  const mobileLayout = globalsCss.match(/@media \(max-width: 639px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const wideLayout = globalsCss.match(/@media \(min-width: 640px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  it("reserves raised page surfaces and shell gutters for wider layouts", () => {
    const surface = globalsCss.match(/\.workspace-surface\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const workspace = globalsCss.match(/\.chat-workspace\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(surface).toContain("border-radius: 0;");
    expect(surface).toContain("box-shadow: none;");
    expect(workspace).toContain(
      "padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);",
    );
    expect(wideLayout).toMatch(/\.chat-workspace\s*\{\s*padding: 0\.75rem;/);
    expect(wideLayout).toMatch(
      /\.workspace-surface\s*\{\s*border-radius: 1rem;\s*box-shadow: var\(--neu-surface-shadow\);/,
    );
  });

  it("bleeds workspace content while preserving command insets and overlay material", () => {
    expect(mobileLayout).toContain('.workspace-page:not([data-workspace-host="answer-canvas"])');
    expect(mobileLayout).toContain("padding: 1rem 0 0;");
    expect(mobileLayout).toMatch(/\.workspace-page-layout\s*>\s*:not\(\.workspace-page-body\)/);
    expect(mobileLayout).toContain("margin-inline: 1rem;");
    expect(mobileLayout).toContain(":is([data-workspace-canvas], [data-workspace-panel])");
    expect(mobileLayout).toContain("border-radius: 0;");
    expect(mobileLayout).toContain("box-shadow: none;");
    expect(mobileLayout).toContain("[data-workspace-canvas]:focus-visible");
    expect(mobileLayout).toContain("outline-offset: -2px;");
  });

  it("assigns phone safe areas to bottom navigation and uses native-size text entry", () => {
    const modeBar = globalsCss.match(/\.mobile-mode-bar\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(modeBar).toContain("env(safe-area-inset-bottom)");
    expect(mobileLayout).toContain('[data-mode-navigation="sidebar"]');
    expect(mobileLayout).toMatch(/\.app-shell-frame :is\(input, textarea, select\)\s*\{\s*font-size: 1rem;/);
    expect(mobileLayout).toMatch(/\[data-chat-composer-footer\]\s*\{\s*padding-bottom: 0.75rem;/);
  });

  it("flattens live chat without changing the landing-page example", () => {
    expect(mobileLayout).toContain("[data-chat-frame] > .chat-message-well");
    expect(mobileLayout).toContain("background: var(--surface);");
    expect(mobileLayout).not.toMatch(/(?:^|\n)\s*\.chat-message-well\s*\{/);
  });

  it("keeps the mobile timetable flush and weekend day tabs scrollable", () => {
    expect(mobileLayout).toContain("[data-schedule-canvas]");
    expect(mobileLayout).toContain("[data-schedule-grid-frame]");
    expect(mobileLayout).toContain(".schedule-grid-day-tabs");
    expect(mobileLayout).toContain("overflow-x: auto;");
    expect(mobileLayout).toContain("min-width: 2.75rem;");
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
