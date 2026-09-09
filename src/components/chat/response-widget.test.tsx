// @vitest-environment happy-dom
import { ChatShellProvider, useChatShell, type ChatShellState } from "@/src/components/chat/chat-shell-context";
import { renderers, ResponseWidget } from "@/src/components/chat/tool-renderers";
import type { ToolCall } from "@/src/lib/api-types";
import { cachePaneState, getCachedPaneState } from "@/src/lib/pane-state-cache";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/src/components/providers", () => ({ useApi: () => ({ listSessions: async () => [] }) }));
vi.mock("@/src/components/auth/app-auth", () => ({ useAppAuth: () => ({ status: "signedOut" }) }));
vi.mock("@/src/components/prereq-tree/prereq-tree-pane", () => ({ PrereqTreePane: () => null }));
vi.mock("@/src/components/map/map-panel", () => ({ MapArea: () => null }));

const mem = new Map<string, string>();
const storagePolyfill: Storage = {
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
  Object.defineProperty(window, "sessionStorage", { value: storagePolyfill, configurable: true, writable: true });
  Object.defineProperty(window, "localStorage", { value: storagePolyfill, configurable: true, writable: true });
  Object.defineProperty(window, "matchMedia", {
    value: () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    }),
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  mem.clear();
  vi.clearAllMocks();
  cleanup();
});
afterAll(() => {
  sessionStorage.clear();
});

const shellRef: { current: ChatShellState | null } = { current: null };
function Capture() {
  shellRef.current = useChatShell();
  return null;
}

function renderWidget(call: ToolCall, callKey?: string) {
  shellRef.current = null;
  return render(
    <ChatShellProvider>
      <ResponseWidget call={call} callKey={callKey} />
      <Capture />
    </ChatShellProvider>,
  );
}

// show_widget type key_dates maps to the calendar pane unconditionally (no
// input/result shape requirements), so it exercises the mapped+clickable path
// without a renderer complicating the DOM.
const keyDatesCall = {
  name: "show_widget",
  input: { type: "key_dates" },
  result: { type: "key_dates", result: { dates: [{ kind: "academic", name: "W", start: "2026-10-01", end: null }] } },
  status: "ok",
} as unknown as ToolCall;
// get_tuition has no canvas mapping: static, non-focusable summary.
const tuitionCall = {
  name: "get_tuition",
  input: { program_slug: "undergraduate" },
  result: { program: "ug", fees: [] },
  status: "ok",
} as unknown as ToolCall;
// walking_distance with no result yet: extractMapHighlight returns null, so
// the widget is unmapped while loading and shows the spinner badge.
const walkingLoadingCall = {
  name: "walking_distance",
  input: { from_building: "A", to_building: "B" },
  result: undefined,
  status: "ok",
} as unknown as ToolCall;
const courseCall = {
  name: "show_widget",
  input: { type: "course" },
  result: {
    type: "course",
    result: {
      code: "CPSC_V 110",
      title: "Computation, Programs, and Programming",
      description: "A first course in programming.",
      credits: 4,
      prerequisite: "One of CPSC 100 or 103",
      corequisite: null,
      sections: [],
    },
  },
  status: "ok",
} as unknown as ToolCall;

describe("5.3 — ResponseWidget (REQ-3, REQ-4)", () => {
  it("a mapped widget is focusable and loads its canvas view on click", () => {
    const { container } = renderWidget(keyDatesCall);
    const widget = container.querySelector('[data-widget="show_widget"]') as HTMLElement;
    expect(widget).not.toBeNull();
    expect(widget.getAttribute("role")).toBe("button");
    expect(widget.getAttribute("tabindex")).toBe("0");
    act(() => {
      fireEvent.click(widget);
    });
    expect(shellRef.current?.workspaceView?.paneId).toBe("calendar");
  });

  it("uses a native shared pill for mapped tool badges", () => {
    const { container } = renderWidget(
      {
        ...walkingLoadingCall,
        result: { from: "ICCS", to: "IBLC", meters: 400, minutes: 5 },
      },
      "walking-badge",
    );
    const badge = container.querySelector('[data-widget="walking_distance"]') as HTMLButtonElement;
    expect(badge.tagName).toBe("BUTTON");
    expect(badge.getAttribute("type")).toBe("button");
    expect(badge.className).toContain("min-h-11");
    expect(badge.className).toContain("sm:min-h-8");
    expect(badge.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(badge);
    expect(shellRef.current?.workspaceView?.paneId).toBe("map");
    expect(badge.getAttribute("aria-pressed")).toBe("true");
  });

  it("reopens a dismissed phone canvas through an explicit mapped action", () => {
    const { container } = renderWidget(keyDatesCall, "reopened");
    act(() => {
      shellRef.current?.setUserDismissedPane(true);
      shellRef.current?.setAnswerSheetOpen(false);
      shellRef.current?.setRightPaneCollapsed(true);
    });
    fireEvent.click(container.querySelector('[data-widget="show_widget"]')!);
    expect(shellRef.current?.answerSheetOpen).toBe(true);
    expect(shellRef.current?.rightPaneCollapsed).toBe(false);
    expect(shellRef.current?.userDismissedPane).toBe(false);
    expect(shellRef.current?.activeCallKey).toBe("reopened");
  });

  it.each([
    ["Add to Calendar", "calendar"],
    ["Show on map", "map"],
  ])("opens the visible destination for %s after a phone dismissal", (action, pane) => {
    const { getByRole } = renderWidget({
      name: "show_widget",
      input: { type: "event" },
      result: { type: "event", result: { events: [{ title: "Campus event", start_date: "2026-10-01" }] } },
    });
    act(() => {
      shellRef.current?.setUserDismissedPane(true);
      shellRef.current?.setAnswerSheetOpen(false);
      shellRef.current?.setRightPaneCollapsed(true);
    });
    fireEvent.click(getByRole("button", { name: action }));
    expect(shellRef.current?.workspaceView?.paneId).toBe(pane);
    expect(shellRef.current?.answerSheetOpen).toBe(true);
    expect(shellRef.current?.rightPaneCollapsed).toBe(false);
    expect(shellRef.current?.userDismissedPane).toBe(false);
    expect(shellRef.current?.activeCallKey).toBeNull();
  });

  it("unmapped tools render a static, non-focusable summary", () => {
    const { container } = renderWidget(tuitionCall);
    const widget = container.querySelector('[data-widget="get_tuition"]') as HTMLElement;
    expect(widget).not.toBeNull();
    expect(widget.getAttribute("role")).toBeNull();
    expect(widget.getAttribute("tabindex")).toBeNull();
  });

  it("the active ring follows the clicked chip only", () => {
    const { container } = renderWidget(keyDatesCall, "m1:tc-0");
    const widget = container.querySelector('[data-widget="show_widget"]') as HTMLElement;
    expect(widget.getAttribute("data-active")).toBeNull();
    act(() => {
      fireEvent.click(widget);
    });
    expect(widget.getAttribute("data-active")).not.toBeNull();
  });

  it("a chip with the same canvas data stays unhighlighted when another chip activated", () => {
    const { container } = renderWidget(keyDatesCall, "m1:tc-2");
    const widget = container.querySelector('[data-widget="show_widget"]') as HTMLElement;
    act(() => {
      shellRef.current?.activateCanvasView(keyDatesCall, "m1:tc-0");
    });
    expect(widget.getAttribute("data-active")).toBeNull();
  });

  it("closing the pane clears the chip highlight", () => {
    const { container } = renderWidget(keyDatesCall, "m1:tc-0");
    const widget = container.querySelector('[data-widget="show_widget"]') as HTMLElement;
    act(() => {
      fireEvent.click(widget);
    });
    expect(widget.getAttribute("data-active")).not.toBeNull();
    act(() => {
      shellRef.current?.setRightPaneCollapsed(true);
    });
    expect(widget.getAttribute("data-active")).toBeNull();
  });

  it("Enter and Space keys activate a mapped widget, and clicking again keeps it active (no toggle-off)", () => {
    const { container } = renderWidget(keyDatesCall);
    const widget = container.querySelector('[data-widget="show_widget"]') as HTMLElement;
    act(() => {
      fireEvent.keyDown(widget, { key: "Enter" });
    });
    expect(shellRef.current?.workspaceView?.paneId).toBe("calendar");
    // Clicking again does not close the pane — only the close button can.
    act(() => {
      fireEvent.keyDown(widget, { key: " " });
    });
    expect(shellRef.current?.workspaceView?.paneId).toBe("calendar");
  });

  it("a loading call stays non-focusable when unmapped", () => {
    const { container } = renderWidget(walkingLoadingCall);
    const widget = container.querySelector('[data-widget="walking_distance"]') as HTMLElement;
    expect(widget.getAttribute("role")).toBeNull();
  });

  it("gives compound course widgets explicit child actions instead of an interactive ancestor", () => {
    const { container, getByRole } = renderWidget(courseCall, "m1:tc-0");
    const widget = container.querySelector('[data-widget="show_widget"]') as HTMLElement;

    expect(widget.getAttribute("role")).toBeNull();
    expect(widget.getAttribute("tabindex")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Course details" }));
    expect(shellRef.current?.workspaceView?.paneId).toBe("course-lookup");
  });

  it("uses the clicked prerequisite root instead of a different cached query", () => {
    cachePaneState("prereq-tree", { root: "MATH 200", query: "MATH 200", selections: {} });
    expect(getCachedPaneState("prereq-tree")?.query).toBe("MATH 200");
    const { getByRole } = renderWidget(courseCall);
    act(() => shellRef.current?.setActiveChannel("calendar", { cursor: "2026-10" }));
    fireEvent.click(getByRole("button", { name: "Prereq Tree" }));
    const state = shellRef.current?.workspaceView?.state;
    expect(state?.root).toBe("CPSC_V 110");
    expect(state?.query || state?.root).toBe("CPSC_V 110");
  });

  it("renders study-space evidence as static rows when no concrete row action exists", () => {
    const call = {
      name: "show_widget",
      input: { type: "study_spaces" },
      result: {
        type: "study_spaces",
        result: { spaces: [{ id: "1", title: "Quiet room", name: null, building_code: "IBLC" }] },
      },
      status: "ok",
    } as unknown as ToolCall;
    const { queryByRole, getByText } = renderWidget(call);

    expect(getByText("Quiet room")).not.toBeNull();
    expect(queryByRole("button", { name: /Quiet room/ })).toBeNull();
  });

  it("only styles program rows as links when they have a destination", () => {
    const call = {
      name: "show_widget",
      input: { type: "program" },
      result: {
        type: "program",
        result: {
          programs: [
            { id: 1, name: "With URL", url: "https://example.com/program", degrees: ["BSc"] },
            { id: 2, name: "Without URL", url: "", degrees: ["BA"] },
          ],
        },
      },
      status: "ok",
    } as unknown as ToolCall;
    const { getByText } = renderWidget(call);

    expect(getByText("With URL").closest("a")?.getAttribute("href")).toBe("https://example.com/program");
    expect(getByText("Without URL").closest("a")).toBeNull();
  });

  it("renders and activates rich building entrance widgets", () => {
    const call = {
      name: "show_widget",
      input: { type: "building_entrances", building_code: "IBLC" },
      result: {
        type: "building_entrances",
        result: {
          building: {
            code: "IBLC",
            name: "Irving K. Barber Learning Centre",
            centroid: [-123.252, 49.267],
          },
          entrances: [{ id: "IBLC-1" }, { id: "IBLC-2" }],
        },
      },
      status: "ok",
    } as unknown as ToolCall;
    const { container, getByText } = renderWidget(call);

    expect(getByText("2 verified entrances")).toBeTruthy();
    fireEvent.click(container.querySelector('[data-widget="show_widget"]') as HTMLElement);
    expect(shellRef.current?.workspaceView?.paneId).toBe("map");
    expect(shellRef.current?.workspaceView?.state.highlight).toMatchObject({ showEntrances: true });
  });

  it("keeps raw evidence visible when a rich renderer crashes", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    renderers.exploding_widget = () => {
      throw new Error("renderer failed");
    };
    const call = {
      name: "exploding_widget",
      input: {},
      result: { course: "CPSC 110" },
      status: "ok",
    } as unknown as ToolCall;

    const { getByRole, getByText } = renderWidget(call);
    expect(getByRole("alert").textContent).toContain("couldn't be displayed");
    expect(getByText(/CPSC 110/)).not.toBeNull();
    delete renderers.exploding_widget;
    error.mockRestore();
  });
});

it("reveals the loaded widget once without remounting on payload updates", () => {
  const view = (call: ToolCall) => (
    <ChatShellProvider>
      <ResponseWidget call={call} />
    </ChatShellProvider>
  );
  const { container, rerender } = render(view({ ...keyDatesCall, result: undefined }));
  const widget = container.querySelector('[data-widget="show_widget"]');
  expect(widget?.querySelector(".ui-content-enter")).toBeNull();
  rerender(view(keyDatesCall));
  const payload = widget?.querySelector(".ui-content-enter");
  expect(payload).not.toBeNull();
  rerender(
    view({
      ...keyDatesCall,
      result: { type: "key_dates", result: { dates: [{ name: "Updated date", start: "2026-10-02" }] } },
    }),
  );
  expect(container.querySelector('[data-widget="show_widget"]')).toBe(widget);
  expect(widget?.querySelector(".ui-content-enter")).toBe(payload);
  expect(payload?.textContent).toContain("Updated date");
});

it("expands extra courses without remounting the preview and deactivates closing rows", () => {
  const courses = Array.from({ length: 6 }, (_, index) => ({
    code: `CPSC ${110 + index}`,
    title: `Course ${index}`,
    credits: 3,
    sections: [],
  }));
  const { getByRole, container } = renderWidget({
    name: "show_widget",
    input: { type: "courses" },
    result: { type: "courses", result: { courses } },
  });
  const preview = getByRole("button", { name: /CPSC 110/ });
  const toggle = getByRole("button", { name: "Show all (6)" });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(container.querySelector("[data-disclosure]")).toBeNull();
  fireEvent.click(toggle);
  expect(getByRole("button", { name: /CPSC 115/ })).not.toBeNull();
  expect(getByRole("button", { name: /CPSC 110/ })).toBe(preview);
  const disclosure = container.querySelector("[data-disclosure]")!;
  expect(disclosure.id).toBe(toggle.getAttribute("aria-controls"));
  fireEvent.click(getByRole("button", { name: "Show fewer" }));
  expect(disclosure.getAttribute("inert")).not.toBeNull();
  expect(disclosure.getAttribute("aria-hidden")).toBe("true");
  expect(getByRole("button", { name: /CPSC 110/ })).toBe(preview);
});
