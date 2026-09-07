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

  it("opens Structure and Issues outside the clipped workspace toolbar", async () => {
    api.getCourseIndex.mockResolvedValue({ courses: [] });
    const { container } = render(<DegreePlannerPane />);
    const trigger = await screen.findByRole("button", { name: "Structure" });
    fireEvent.click(trigger);
    const structure = screen.getByRole("dialog", { name: "Plan structure" });
    expect(container.contains(structure)).toBe(false);
    expect(trigger.getAttribute("aria-controls")).toBe(structure.id);
    expect(screen.getByRole("combobox", { name: "Years in plan" })).not.toBeNull();
    fireEvent.keyDown(structure, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Plan structure" })).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Issues" }));
    const issues = screen.getByRole("dialog", { name: "Placement issues" });
    expect(container.contains(issues)).toBe(false);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Placement issues" })).toBeNull();
  });

  it("replaces skeletons with retry feedback when the index fails", async () => {
    api.getCourseIndex.mockRejectedValue(new Error("offline"));
    const { container } = render(<DegreePlannerPane />);
    expect(await screen.findByRole("alert")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).not.toBeNull();
    expect(container.querySelector("[data-skeleton]")).toBeNull();
  });
});
