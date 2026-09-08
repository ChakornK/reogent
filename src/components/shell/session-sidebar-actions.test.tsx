// @vitest-environment happy-dom
import { ChatShellProvider, useChatShell } from "@/src/components/chat/chat-shell-context";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionSidebar } from "./session-sidebar";

const values = new Map<string, string>();
const storage: Storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => void values.set(key, String(value)),
  removeItem: (key) => void values.delete(key),
  clear: () => values.clear(),
  key: (index) => Array.from(values.keys())[index] ?? null,
  get length() {
    return values.size;
  },
};
Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
Object.defineProperty(window, "sessionStorage", { configurable: true, value: storage });

const api = vi.hoisted(() => ({
  listSessions: vi.fn(async () => [
    {
      session_id: "session-1",
      title: "A conversation with a long title",
      updatedAt: new Date().toISOString(),
    },
  ]),
  renameSession: vi.fn(async () => ({})),
  deleteSession: vi.fn(async () => ({})),
}));

vi.mock("@/src/components/providers", () => ({ useApi: () => api }));
vi.mock("@/src/components/auth/app-auth", () => ({
  useAppAuth: () => ({ status: "signedIn", isGuest: false, user: { userId: "user-1", username: "student" } }),
}));
vi.mock("@/src/components/shell/shell-navigation", () => ({
  useShellNavigation: () => ({
    committedPathname: "/chat",
    displayPathname: "/chat",
    pending: false,
    push: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({ useParams: () => ({}), usePathname: () => "/chat" }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  values.clear();
});

function RefreshSessions() {
  const { refreshSessions } = useChatShell();
  return (
    <button type="button" onClick={refreshSessions}>
      Refresh sessions
    </button>
  );
}

describe("SessionSidebar actions", () => {
  it("keeps loaded session rows during refresh and refresh failure", async () => {
    const { container } = render(
      <ChatShellProvider>
        <SessionSidebar />
        <RefreshSessions />
      </ChatShellProvider>,
    );
    await screen.findByRole("button", { name: "A conversation with a long title" });
    let reject!: (error: Error) => void;
    api.listSessions.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Refresh sessions" }));
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: "A conversation with a long title" })).not.toBeNull();
    expect(container.querySelector("[data-skeleton]")).toBeNull();
    expect(screen.getByText("Updating conversations…")).not.toBeNull();
    await act(async () => {
      reject(new Error("offline"));
    });
    expect(screen.getByRole("alert").textContent).toContain("Couldn’t refresh conversations");
    expect(screen.getByRole("button", { name: "A conversation with a long title" })).not.toBeNull();
  });
  it("scopes session group labels to each desktop and drawer instance", async () => {
    const { container } = render(
      <ChatShellProvider>
        <SessionSidebar />
        <SessionSidebar />
      </ChatShellProvider>,
    );
    expect(await screen.findAllByRole("button", { name: "A conversation with a long title" })).toHaveLength(2);
    const groups = [...container.querySelectorAll("ul[aria-labelledby]")];
    const ids = groups.map((group) => group.getAttribute("aria-labelledby"));
    expect(groups).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(document.getElementById(id ?? "")?.textContent).toBe("Today");
  });

  it("keeps routine row actions visible and touchable on mobile", async () => {
    const { container } = render(
      <ChatShellProvider>
        <SessionSidebar />
      </ChatShellProvider>,
    );

    await screen.findByRole("button", { name: "A conversation with a long title" });
    const rename = screen.getByRole("button", { name: "Rename" });
    const actions = rename.parentElement as HTMLElement;
    const open = screen.getByRole("button", { name: "A conversation with a long title" });

    expect(rename.className).toContain("size-11");
    expect(rename.className).toContain("sm:size-8");
    expect(actions.className).toContain("opacity-100");
    expect(actions.className).toContain("sm:opacity-0");
    expect(open.className).toContain("pr-24");
    expect(open.className).toContain("pl-3");
    expect(open.className).toContain("sm:pr-3");

    fireEvent.click(rename);
    const confirm = screen.getByRole("button", { name: "Confirm rename" });
    const input = screen.getByRole("textbox");
    expect(confirm.className).toContain("size-11");
    expect(confirm.className).toContain("sm:size-8");
    expect(input.className).toContain("h-11");
    expect(input.className).toContain("sm:h-7");
    expect(container.querySelector("[data-session-editing]")?.className).toContain("min-h-11");
  });
});
