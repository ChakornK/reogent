// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast";

const preference = vi.hoisted(() => ({ reduce: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => preference.reduce,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function ToastTrigger() {
  const toast = useToast();
  const next = useRef(0);
  return (
    <button type="button" onClick={() => toast(`Saved ${++next.current}`, next.current === 2 ? "error" : "info")}>
      Notify
    </button>
  );
}

describe("ToastProvider motion", () => {
  it.each([false, true])("keeps the timer and three-message limit with reduced motion %s", async (reduce) => {
    preference.reduce = reduce;
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    const stack = screen.getByRole("status");
    const trigger = screen.getByRole("button", { name: "Notify" });
    expect(stack.className).toContain("app-notification-stack");
    expect(stack.className).not.toContain("bottom-5");
    for (let index = 0; index < 4; index++) fireEvent.click(trigger);
    expect(
      [...stack.children].filter((item) => item.getAttribute("aria-hidden") !== "true").map((item) => item.textContent),
    ).toEqual(["Saved 2", "Saved 3", "Saved 4"]);
    expect(screen.getByText("Saved 2").className).toContain("text-error");
    if (reduce) expect(screen.getByText("Saved 4").style.opacity).toBe("1");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4199);
    });
    expect(screen.getByText("Saved 4").getAttribute("aria-hidden")).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect([...stack.children].filter((item) => item.getAttribute("aria-hidden") !== "true")).toHaveLength(0);
  });
});
