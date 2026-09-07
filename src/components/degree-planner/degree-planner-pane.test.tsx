// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getCourseIndex: vi.fn() }));
vi.mock("@/src/components/providers", () => ({ useApi: () => api }));
vi.mock("./use-plan-sync", () => ({ usePlanSync: () => {} }));

const { DegreePlannerPane } = await import("./degree-planner-pane");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("planner loading layout", () => {
  it("preserves both rail panels, board padding, and compact view switching", () => {
    api.getCourseIndex.mockReturnValue(new Promise(() => {}));
    const { container } = render(<DegreePlannerPane />);
    const page = container.querySelector("[data-workspace-page]");
    expect(page?.getAttribute("data-workspace-composition")).toBe("split");
    expect(container.querySelectorAll("[data-workspace-panel]")).toHaveLength(2);
    expect(container.querySelector("[data-workspace-canvas]")?.className).toContain("p-4");
    expect(
      screen.getByRole("status", { name: "Loading course index…" }).querySelector("[data-skeleton]"),
    ).not.toBeNull();
    expect(container.querySelector(".animate-spin")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Requirements and courses" }));
    expect(page?.getAttribute("data-workspace-view")).toBe("rail");
  });

  it("replaces skeletons with retry feedback when the index fails", async () => {
    api.getCourseIndex.mockRejectedValue(new Error("offline"));
    const { container } = render(<DegreePlannerPane />);
    expect(await screen.findByRole("alert")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).not.toBeNull();
    expect(container.querySelector("[data-skeleton]")).toBeNull();
  });
});
