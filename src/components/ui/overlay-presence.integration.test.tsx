// @vitest-environment happy-dom
import { cleanup, render, waitFor } from "@testing-library/react";
import { AnimatePresence } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DialogPanel, DialogRoot } from "./dialog";

const preference = vi.hoisted(() => ({ reduce: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => preference.reduce,
}));

function Fixture({ open }: { open: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <DialogRoot key="dialog" onDismiss={() => {}} backdropLabel="Close dialog">
          <DialogPanel aria-label="Presence dialog">
            <button type="button">Action</button>
          </DialogPanel>
        </DialogRoot>
      ) : null}
    </AnimatePresence>
  );
}

afterEach(() => {
  cleanup();
  preference.reduce = false;
});

describe("real overlay presence lifecycle", () => {
  it("removes reduced-motion dialogs after the parent registers their exit", async () => {
    preference.reduce = true;
    const view = render(<Fixture open />);
    expect(document.querySelector("[data-dialog-root]")).not.toBeNull();
    view.rerender(<Fixture open={false} />);
    await waitFor(() => expect(document.querySelector("[data-dialog-root]")).toBeNull());
    expect(view.container.inert).toBe(false);
  });

  it("removes dialogs when native animation is unavailable", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: undefined });
    try {
      const view = render(<Fixture open />);
      view.rerender(<Fixture open={false} />);
      await waitFor(() => expect(document.querySelector("[data-dialog-root]")).toBeNull());
      expect(view.container.inert).toBe(false);
    } finally {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, "animate", descriptor);
      else Reflect.deleteProperty(HTMLElement.prototype, "animate");
    }
  });
});
