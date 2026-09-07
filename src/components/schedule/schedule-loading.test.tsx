// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScheduleProfileSkeleton } from "./schedule-loading";

afterEach(cleanup);

function ProfileLoadingHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Import schedule
      </button>
      {open ? <ScheduleProfileSkeleton title="Who is this schedule for?" onCancel={() => setOpen(false)} /> : null}
    </>
  );
}

describe("ScheduleProfileSkeleton", () => {
  it("keeps profile geometry and title without exposing fake form controls", () => {
    render(<ScheduleProfileSkeleton title="Replace your schedule" onCancel={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Replace your schedule" });
    expect(dialog.className).toContain("max-w-md");
    expect(dialog.className).toContain("p-4 sm:p-6");
    expect(within(dialog).getByRole("heading", { name: "Replace your schedule" })).toBeTruthy();
    const summary = within(dialog).getByRole("status", { name: "Loading schedule profile" });
    expect(summary.className).toContain("mt-4");
    expect(summary.className).toContain("p-3");
    expect(summary.querySelector("[data-skeleton]")).toBeTruthy();
    expect(within(dialog).getByRole("status", { name: "Loading handle field" }).parentElement?.className).toContain(
      "mt-4",
    );
    expect(within(dialog).getByRole("status", { name: "Loading avatar choices" }).className).toContain("mt-4");
    expect(within(dialog).getAllByRole("button")).toHaveLength(1);
    expect(dialog.querySelector("input, select, textarea")).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Cancel" }).parentElement?.className).toContain("mt-6");
    for (const skeleton of dialog.querySelectorAll("[data-skeleton]")) {
      expect(skeleton.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it.each(["emoji", "image"] as const)("reserves the %s avatar picker content", (avatarKind) => {
    render(<ScheduleProfileSkeleton title="Replace your schedule" avatarKind={avatarKind} onCancel={vi.fn()} />);
    const avatar = screen.getByRole("status", { name: "Loading avatar choices" });
    const blocks = Array.from(avatar.querySelectorAll("[data-skeleton]"));
    expect(blocks.some((block) => block.className.includes(avatarKind === "emoji" ? "h-40" : "sm:h-10"))).toBe(true);
  });

  it.each(["Escape", "Cancel", "backdrop"])("dismisses with %s and restores the import trigger", async (method) => {
    render(<ProfileLoadingHarness />);
    const trigger = screen.getByRole("button", { name: "Import schedule" });
    trigger.focus();
    fireEvent.click(trigger);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
    fireEvent.keyDown(cancel, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);
    if (method === "Escape") fireEvent.keyDown(cancel, { key: "Escape" });
    else
      fireEvent.click(method === "Cancel" ? cancel : screen.getByRole("button", { name: "Cancel schedule profile" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
