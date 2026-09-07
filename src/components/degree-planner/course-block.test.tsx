/** @vitest-environment happy-dom */
import type { CourseIndexEntry } from "@/app/api/course-index/route";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CourseBlock } from "./course-block";
import { LookupBlock } from "./lookup-block";
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

vi.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({ listeners: undefined, setNodeRef: vi.fn(), isDragging: false }),
}));

const course: CourseIndexEntry = {
  code: "CPSC 221",
  title: "Basic Algorithms and Data Structures",
  credits: 4,
  prerequisite: null,
  corequisite: null,
};

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

function chipLayout(chip: HTMLElement) {
  return [chip, ...chip.querySelectorAll<HTMLElement>("div, button, span")].map((element) => ({
    tag: element.tagName,
    classes: element.className.replace(/\binvisible\b/g, "").trim(),
  }));
}

describe("Course chip layout", () => {
  it("preserves geometry and typography from the finder through dragging and placement", () => {
    const { container, rerender } = render(<LookupBlock entry={course} />);
    const source = container.firstElementChild as HTMLElement;
    const layout = chipLayout(source);

    expect(source.querySelector(".font-mono")).toBeNull();

    rerender(<LookupBlock entry={course} ghost />);
    const lookupGhost = container.firstElementChild as HTMLElement;
    expect(chipLayout(lookupGhost)).toEqual(layout);
    expect(lookupGhost.hasAttribute("inert")).toBe(true);
    expect(lookupGhost.getAttribute("aria-hidden")).toBe("true");

    rerender(<CourseBlock blockId="block-1" code={course.code} entry={course} validation={validation} />);
    const placed = container.firstElementChild as HTMLElement;
    expect(chipLayout(placed)).toEqual(layout);
    expect(placed.hasAttribute("inert")).toBe(false);

    rerender(<CourseBlock blockId="block-1" code={course.code} entry={course} validation={validation} ghost />);
    const blockGhost = container.firstElementChild as HTMLElement;
    expect(chipLayout(blockGhost)).toEqual(layout);
    expect(blockGhost.hasAttribute("inert")).toBe(true);
  });

  it("keeps the term picker outside the measured drag surface", () => {
    const { container, rerender } = render(
      <CourseBlock blockId="block-1" code={course.code} entry={course} validation={validation} />,
    );
    const layout = chipLayout(container.firstElementChild as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    const select = screen.getByRole("combobox", { name: "Move CPSC 221 to term" });
    expect(select.closest("[data-block-id]")).toBeNull();
    expect(select.classList.contains("shrink-0")).toBe(true);
    expect(chipLayout(container.firstElementChild as HTMLElement)).toEqual(layout);

    rerender(<CourseBlock blockId="block-1" code={course.code} entry={course} validation={validation} ghost />);
    expect(chipLayout(container.firstElementChild as HTMLElement)).toEqual(layout);
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("keeps the code and action slots when catalog metadata is missing", () => {
    const { container, rerender } = render(
      <CourseBlock blockId="block-1" code={course.code} entry={course} validation={validation} />,
    );
    const layout = chipLayout(container.firstElementChild as HTMLElement);
    rerender(<CourseBlock blockId="block-1" code={course.code} entry={undefined} validation={validation} />);
    expect(chipLayout(container.firstElementChild as HTMLElement)).toEqual(layout);
    expect(screen.getByRole("button", { name: "Remove CPSC 221" })).toBeTruthy();
  });
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
