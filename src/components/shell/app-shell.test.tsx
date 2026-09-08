// @vitest-environment happy-dom
import { ChatShellProvider } from "@/src/components/chat/chat-shell-context";
import { AppShell } from "@/src/components/shell/app-shell";
import { ShellNavigationProvider } from "@/src/components/shell/shell-navigation";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Heavy sub-trees are stubbed so the assertions target AppShell's composition
// (regions + #main-content + sheet/drawer), not the pane internals.
vi.mock("@/src/components/auth/app-auth", () => ({ useAppAuth: () => ({ status: "signedIn" }) }));
vi.mock("@/src/components/providers", () => ({ useApi: () => ({ listSessions: async () => [] }) }));
vi.mock("@/src/components/map/map-panel", () => ({
  MapArea: () => <div data-testid="map-area" />,
}));
vi.mock("@/src/components/prereq-tree/prereq-tree-pane", () => ({ PrereqTreePane: () => null }));
vi.mock("@/src/components/calendar/calendar-pane", () => ({
  CalendarPane: () => <div data-testid="calendar-pane" />,
}));
vi.mock("@/src/components/course-lookup/course-lookup-pane", () => ({ CourseLookupPane: () => null }));
vi.mock("@/src/components/shell/session-sidebar", () => ({
  useSidebarCollapsed: () => [false, () => {}],
  BrandHeader: ({ trailing }: { trailing?: ReactNode }) => trailing,
  SessionSidebar: ({ footer, onCollapse }: { footer?: ReactNode; onCollapse?: () => void }) => (
    <div data-testid="session-list">
      {onCollapse && (
        <button id="desktop-session-collapse" type="button" onClick={onCollapse}>
          Collapse sessions
        </button>
      )}
      {footer}
    </div>
  ),
}));
vi.mock("@/src/components/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/src/components/shell/user-menu", () => ({ UserMenu: () => null }));
vi.mock("@/src/components/ui/live-region", () => ({ LiveRegion: () => null }));
const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => pathname.value,
  useParams: () => ({}),
}));

let viewportWidth = 390;
const mediaQueries = new Map<string, { media: MediaQueryList; listeners: Set<EventListener> }>();

function resizeViewport(width: number) {
  act(() => {
    const previousWidth = viewportWidth;
    viewportWidth = width;
    for (const [query, { media, listeners }] of mediaQueries) {
      const minWidth = Number(query.match(/min-width: (\d+)px/)?.[1]);
      if (previousWidth >= minWidth === media.matches) continue;
      const event = new Event("change");
      Object.assign(event, { matches: media.matches, media: query });
      for (const listener of listeners) listener(event);
    }
  });
}
const mem = new Map<string, string>();
const storage: Storage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => void mem.set(k, String(v)),
  removeItem: (k) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => Array.from(mem.keys())[i] ?? null,
  get length() {
    return mem.size;
  },
};

beforeAll(() => {
  vi.spyOn(Element.prototype, "animate").mockReturnValue({ cancel: () => {} } as Animation);
  Object.defineProperty(window, "sessionStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => {
      let entry = mediaQueries.get(query);
      if (!entry) {
        const listeners = new Set<EventListener>();
        const media = {
          media: query,
          get matches() {
            const minWidth = query.match(/min-width: (\d+)px/);
            return minWidth ? viewportWidth >= Number(minWidth[1]) : false;
          },
          addEventListener: (_type: string, listener: EventListener) => listeners.add(listener),
          removeEventListener: (_type: string, listener: EventListener) => listeners.delete(listener),
          addListener() {},
          removeListener() {},
        } as MediaQueryList;
        entry = { media, listeners };
        mediaQueries.set(query, entry);
      }
      return entry.media;
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  pathname.value = "/";
  mem.clear();
  vi.clearAllMocks();
  cleanup();
  mediaQueries.clear();
  viewportWidth = 390;
  document.body.style.overflow = "";
});
afterAll(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

function ShellFixture() {
  return (
    <ChatShellProvider>
      <AppShell>
        <div data-testid="chat-children" />
      </AppShell>
    </ChatShellProvider>
  );
}

function NavigatingShellFixture() {
  return (
    <ShellNavigationProvider>
      <ChatShellProvider>
        <AppShell>
          <div data-testid="chat-children" />
        </AppShell>
      </ChatShellProvider>
    </ShellNavigationProvider>
  );
}

function renderShell(wide: boolean) {
  viewportWidth = wide ? 1440 : 390;
  return render(<ShellFixture />);
}

function modeLink(container: HTMLElement, label: string): HTMLAnchorElement {
  const link = Array.from(container.querySelectorAll<HTMLAnchorElement>("[data-mode-toggle]")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!link) throw new Error(`Missing ${label} mode link`);
  return link;
}

describe("10.4 — AppShell layouts (REQ-2.1, REQ-4.1, REQ-7.1)", () => {
  it("inline AI renders chat + Answer Canvas with the skip target on chat", () => {
    const { container, getByTestId } = renderShell(true);
    expect(container.querySelector("#main-content")?.getAttribute("data-pane")).toBe("chat");
    expect(container.querySelector("[data-workspace-surface]")).toBeNull();
    expect(getByTestId("chat-children")).toBeDefined();
    expect(container.querySelector('[data-testid="session-list"]')).not.toBeNull();
    expect(container.querySelector("[data-mode-toggle]")).not.toBeNull();
    expect(container.querySelector('[data-answer-sheet="closed"]')).not.toBeNull();
    expect(container.querySelector("[data-shell-route-content]")?.getAttribute("data-route-transition")).toBeNull();
  });

  it("inline AI right pane starts collapsed and has no re-expand in topbar", () => {
    const { container } = renderShell(true);

    const sheet = container.querySelector("[data-answer-sheet]");
    expect(sheet?.classList.contains("sm:grow-0")).toBe(true);
    expect(sheet?.classList.contains("sm:invisible")).toBe(true);

    // There is no topbar expand button for the right pane.
    expect(container.querySelector('[aria-label="Expand right pane"]')).toBeNull();
  });

  it("renders pathname-owned tool content without a post-paint activator", () => {
    pathname.value = "/tools/map";
    const view = renderShell(true);
    expect(view.getByTestId("map-area")).not.toBeNull();

    pathname.value = "/tools/calendar";
    view.rerender(<ShellFixture />);
    expect(view.queryByTestId("map-area")).toBeNull();
    expect(view.getByTestId("calendar-pane")).not.toBeNull();
  });

  it("preserves the active ChatPanel when native history mints its session URL", () => {
    pathname.value = "/chat";
    const view = renderShell(true);
    const chat = view.getByTestId("chat-children");

    pathname.value = "/chat/f1100000-0000-4000-8000-000000000001";
    view.rerender(<ShellFixture />);

    expect(view.getByTestId("chat-children")).toBe(chat);
  });

  it("replaces old chat with the intended tool before pathname commit", () => {
    pathname.value = "/chat";
    const { container, getByTestId, queryByTestId } = render(<NavigatingShellFixture />);

    act(() => fireEvent.click(modeLink(container, "Tools")));

    expect(container.querySelector("#main-content")?.getAttribute("data-pane")).toBe("tool");
    expect(getByTestId("map-area")).not.toBeNull();
    expect(queryByTestId("chat-children")).toBeNull();
    expect(container.querySelector("[data-shell-navigation-pending='/tools/map']")).not.toBeNull();
    expect(container.querySelector("[data-shell-route-content]")?.getAttribute("data-route-transition")).toBe("true");
  });

  it("uses destination-shaped loading instead of Pulse when entering AI", () => {
    pathname.value = "/pulse";
    const { container, queryByTestId } = render(<NavigatingShellFixture />);

    act(() => fireEvent.click(modeLink(container, "AI")));

    expect(container.querySelector("#main-content")?.getAttribute("data-pane")).toBe("chat");
    expect(container.querySelector("[data-new-chat-loading]")).not.toBeNull();
    expect(container.querySelector("[data-answer-canvas-loading]")).not.toBeNull();
    expect(queryByTestId("chat-children")).toBeNull();
  });

  it("Tools mode renders no right pane collapse button", () => {
    const { container } = renderShell(true);
    fireEvent.click(modeLink(container, "Tools"));
    expect(container.querySelector('[aria-label="Close answer canvas"]')).toBeNull();
    expect(container.querySelector('[aria-label="Expand right pane"]')).toBeNull();
  });

  it("shares the dynamic mobile shell and safe-area menu placement with loading", () => {
    const { container, getByRole } = renderShell(false);
    const shell = container.querySelector(".app-shell-frame");
    expect(shell?.className).toContain("h-dvh");
    expect(shell?.querySelector(".chat-workspace")?.classList.contains("p-3")).toBe(false);
    expect(getByRole("button", { name: "Open sidebar" }).className).toContain("shell-menu-trigger");
  });

  it("mobile AI has no way to manually open the answer sheet — only show_widget can", () => {
    const { container } = renderShell(false);
    expect(container.querySelector('[data-answer-sheet="open"]')).toBeNull();
    expect(container.querySelector('[aria-label="Open answer canvas"]')).toBeNull();
  });

  it("inline Tools renders the Full-Bleed Tool with the skip target on the tool", () => {
    const { container } = renderShell(true);
    fireEvent.click(modeLink(container, "Tools"));
    expect(container.querySelector("#main-content")?.getAttribute("data-pane")).toBe("tool");
    const surface = container.querySelector("[data-workspace-surface]");
    expect(surface?.className).toContain("workspace-surface");
    expect(surface?.className).toContain("overflow-hidden");
    // The provider-free fixture changes remembered mode, but its mocked router
    // does not commit a pathname. Without a routed tool view, the route child remains.
    expect(container.querySelector('[data-testid="chat-children"]')).not.toBeNull();
    expect(container.querySelector("[data-tool-list]")).not.toBeNull();
  });

  it("renders Settings as a utility workspace without exposing the prior tool as current", () => {
    const view = renderShell(true);
    fireEvent.click(modeLink(view.container, "Tools"));
    fireEvent.click(view.container.querySelector('[data-tool-id="prereq-tree"]') as HTMLElement);

    pathname.value = "/settings";
    view.rerender(<ShellFixture />);

    expect(view.container.querySelectorAll("main")).toHaveLength(1);
    expect(view.container.querySelector("#main-content")?.getAttribute("data-pane")).toBe("settings");
    expect(view.container.querySelector("#main-content")?.getAttribute("data-shell-mode")).toBe("tools");
    expect(view.container.querySelector("[data-workspace-surface]")).not.toBeNull();
    expect(view.container.querySelector('[data-testid="chat-children"]')).not.toBeNull();
    expect(view.container.querySelector('[data-tool-id="prereq-tree"]')?.getAttribute("aria-current")).toBeNull();
    expect(view.container.querySelector("[data-answer-sheet]")).toBeNull();
  });

  it("Unity uses the same shell-owned workspace surface", () => {
    const { container } = renderShell(true);
    fireEvent.click(modeLink(container, "Unity"));

    expect(container.querySelector("#main-content")?.getAttribute("data-pane")).toBe("unity");
    expect(container.querySelector("[data-workspace-surface]")?.className).toContain("workspace-surface");
    expect(container.querySelector("[data-testid='chat-children']")).not.toBeNull();
  });

  it("compact Tools lives in the left drawer and keeps the tool full-bleed", () => {
    const { container } = renderShell(false);
    fireEvent.click(modeLink(container, "Tools"));
    const opener = container.querySelector('[aria-label="Open sidebar"]') as HTMLElement;
    expect(opener.className).toContain("z-40");
    fireEvent.click(opener);
    const drawer = container.querySelector('[role="dialog"][aria-label="Tools"]');
    expect(drawer).not.toBeNull();
    expect(drawer?.querySelector("[data-tool-list]")).not.toBeNull();
    expect(container.querySelector("#main-content")?.getAttribute("data-pane")).toBe("tool");
  });
});

describe("13.2 — ARIA landmarks (REQ-8.2)", () => {
  it("the ChatSurface wrapper is the sole <main> and carries #main-content; the Answer canvas is a labelled region", () => {
    const { container } = renderShell(true);
    const main = container.querySelectorAll("main");
    expect(main.length).toBe(1);
    expect(main[0]?.id).toBe("main-content");
    expect(main[0]?.getAttribute("data-pane")).toBe("chat");
    expect(container.querySelector('[aria-label="Answer canvas"]')).toBeNull();
  });
});

describe("13.3 — focus move/return + inert (REQ-2.5, REQ-8.1, REQ-8.3)", () => {
  it("closing the left drawer returns focus to the Open-sidebar button", () => {
    const { container } = renderShell(false);
    const opener = container.querySelector('[aria-label="Open sidebar"]') as HTMLButtonElement;
    fireEvent.click(opener);
    expect(container.querySelector('[role="dialog"]')?.parentElement?.hasAttribute("inert")).toBe(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector('[role="dialog"]')?.parentElement?.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(opener);
  });
});

describe("sidebar responsive cleanup", () => {
  it.each([
    ["AI", "/chat", 1024],
    ["Unity", "/pulse", 1024],
    ["Tools", "/tools/map", 1280],
  ])("closes %s at its desktop breakpoint and restores desktop focus", (_mode, path, breakpoint) => {
    pathname.value = path;
    document.body.style.overflow = "auto";
    const { container, getByRole } = renderShell(false);
    const opener = getByRole("button", { name: "Open sidebar" });
    fireEvent.click(opener);
    expect(container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    resizeViewport(Number(breakpoint) - 1);
    expect(container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(true);
    resizeViewport(Number(breakpoint));

    expect(container.querySelector('[role="dialog"]')?.parentElement?.hasAttribute("inert")).toBe(true);
    expect(container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(false);
    expect(opener.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("auto");
    expect(document.activeElement).toBe(container.querySelector("#desktop-session-collapse"));

    resizeViewport(390);
    expect(container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(false);
    fireEvent.click(opener);
    expect(document.body.style.overflow).toBe("hidden");
    resizeViewport(1440);
    expect(container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("auto");
  });

  it.each(["/chat", "/pulse"])("closes an open Tools drawer when the mode changes to %s on desktop", (path) => {
    pathname.value = "/tools/map";
    viewportWidth = 1100;
    const view = render(<ShellFixture />);
    fireEvent.click(view.getByRole("button", { name: "Open sidebar" }));
    expect(view.container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(true);

    pathname.value = path;
    view.rerender(<ShellFixture />);

    expect(view.container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(view.container.querySelector("#desktop-session-collapse"));
    expect(mediaQueries.get("(min-width: 1280px)")?.listeners.size).toBe(0);
  });

  it("updates the listener when an open compact drawer changes mode and cleans up on unmount", () => {
    pathname.value = "/chat";
    const view = renderShell(false);
    fireEvent.click(view.getByRole("button", { name: "Open sidebar" }));
    pathname.value = "/tools/map";
    view.rerender(<ShellFixture />);

    expect(mediaQueries.get("(min-width: 1024px)")?.listeners.size).toBe(0);
    expect(mediaQueries.get("(min-width: 1280px)")?.listeners.size).toBe(1);
    resizeViewport(1100);
    expect(view.container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    view.unmount();
    expect(mediaQueries.get("(min-width: 1280px)")?.listeners.size).toBe(0);
    expect(document.body.style.overflow).toBe("");
  });

  it("leaves the drawer open when Escape is already prevented", () => {
    const { container, getByRole } = renderShell(false);
    fireEvent.click(getByRole("button", { name: "Open sidebar" }));
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    event.preventDefault();
    fireEvent(document, event);
    expect(container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it.each(["data-floating-panel", "data-dialog-root"])("leaves Escape to a portaled %s child", (attribute) => {
    const { container, getByRole } = renderShell(false);
    fireEvent.click(getByRole("button", { name: "Open sidebar" }));
    const panel = document.createElement("div");
    panel.setAttribute(attribute, "");
    const child = document.createElement("button");
    panel.append(child);
    document.body.append(panel);
    try {
      fireEvent.keyDown(child, { key: "Escape" });
      expect(container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(true);
      expect(document.body.style.overflow).toBe("hidden");
    } finally {
      panel.remove();
    }
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector(".shell-body")?.hasAttribute("inert")).toBe(false);
  });
});
