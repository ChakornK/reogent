/** @vitest-environment happy-dom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CourseBlock } from "./course-block";
import type { BlockValidation } from "./validation";

const activators = vi.hoisted(() => ({
  mouseDown: vi.fn(),
  touchStart: vi.fn(),
}));

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    listeners: {
      onMouseDown: activators.mouseDown,
      onTouchStart: activators.touchStart,
    },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

const validation: BlockValidation = {
  ok: true,
  missing: [],
  completedBefore: new Set(),
  completedSameOrBefore: new Set(),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CourseBlock drag activation", () => {
  it("forwards mouse and touch activators from the chip but not its controls", () => {
    const { container } = render(
      <CourseBlock blockId="block-1" code="CPSC 221" entry={undefined} validation={validation} />,
    );
    const chip = container.querySelector<HTMLElement>("[data-block-id='block-1']");
    if (!chip) throw new Error("Missing course chip");

    fireEvent.mouseDown(chip, { button: 0 });
    fireEvent.touchStart(chip, { touches: [{ clientX: 10, clientY: 10 }] });

    expect(activators.mouseDown).toHaveBeenCalledTimes(1);
    expect(activators.touchStart).toHaveBeenCalledTimes(1);

    const remove = screen.getByRole("button", { name: "Remove CPSC 221" });
    fireEvent.mouseDown(remove, { button: 0 });
    fireEvent.touchStart(remove, { touches: [{ clientX: 10, clientY: 10 }] });

    expect(activators.mouseDown).toHaveBeenCalledTimes(1);
    expect(activators.touchStart).toHaveBeenCalledTimes(1);
  });
});
