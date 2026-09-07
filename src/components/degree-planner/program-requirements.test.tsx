// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getRequirementsFor = vi.hoisted(() => vi.fn());
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

vi.mock("@/src/lib/program-requirements", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/program-requirements")>();
  return {
    ...actual,
    getRequirementsFor,
    getProgramIndex: async () => ({
      faculties: ["Science"],
      majorsByFaculty: new Map([["Science", [{ url: "https://calendar.ubc.ca/program", label: "Computer Science" }]]]),
      minorsByFaculty: new Map([["Science", []]]),
    }),
  };
});

Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });

const { ProgramSelectors, ProgramSelectorsLoading, ProgramProgress } = await import("./program-requirements");
const { usePlanner } = await import("./planner-store");

afterEach(() => {
  cleanup();
  values.clear();
  getRequirementsFor.mockReset();
});

describe("ProgramSelectors", () => {
  it("reserves the responsive three-field row while programs load", () => {
    usePlanner.setState({ major: null });
    const { container } = render(<ProgramSelectorsLoading />);
    expect(screen.getByRole("status", { name: "Loading programs…" }).className).toContain("grid-cols-2");
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(6);
    expect(screen.queryByRole("combobox")).toBeNull();
  });
  it("reserves the selected program action and wrapping caption geometry while loading", () => {
    usePlanner.setState({ major: "https://calendar.ubc.ca/program" });
    const { container } = render(<ProgramSelectorsLoading />);
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(7);
    const caption = screen.getByText("Major / program");
    const header = caption.parentElement?.parentElement;
    expect(header?.className).toContain("flex-wrap");
    expect(header?.parentElement?.className).toContain("gap-1.5");
    expect(screen.getByText("UBC Calendar").parentElement?.className).toContain("min-h-11");
    expect(screen.getByText("UBC Calendar").parentElement?.className).toContain("sm:min-h-0");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("commits an exact faculty choice and preserves its program when refocused", async () => {
    usePlanner.setState({ faculty: null, major: null, minor: null });
    render(<ProgramSelectors />);
    const faculty = await screen.findByRole("combobox", { name: "Faculty" });
    fireEvent.change(faculty, { target: { value: "Science" } });
    expect(usePlanner.getState().faculty).toBe("Science");

    const major = screen.getByRole("combobox", { name: "Major / program" }) as HTMLInputElement;
    expect(major.disabled).toBe(false);
    fireEvent.change(major, { target: { value: "Computer Science" } });
    expect(usePlanner.getState().major).toBe("https://calendar.ubc.ca/program");

    fireEvent.focus(faculty);
    fireEvent.blur(faculty);
    expect(usePlanner.getState().major).toBe("https://calendar.ubc.ca/program");
  });

  it("keeps external navigation separate from the major field label", async () => {
    usePlanner.setState({
      faculty: "Science",
      major: "https://calendar.ubc.ca/program",
      minor: null,
    });
    const { container } = render(<ProgramSelectors />);

    const link = await screen.findByRole("link", { name: /UBC Calendar/ });
    const layout = container.firstElementChild as HTMLElement;
    expect(layout.className).toContain("grid-cols-2");
    expect(layout.className).toContain("@min-[55rem]:flex");
    const input = screen.getByRole("combobox", { name: "Major / program" });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe("Computer Science"));
    expect(link.closest("label")).toBeNull();
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.className).toContain("focus-visible:ring-2");
    expect(link.parentElement?.className).toContain("flex-wrap");
    expect(link.parentElement?.parentElement).toBe(input.parentElement);
    expect(input.parentElement?.className).toContain("gap-1.5");
    expect(input.className).toContain("h-11");
    expect(input.className).toContain("sm:h-9");
    expect(screen.getByText("Major / program").tagName).toBe("LABEL");
  });
});

describe("ProgramProgress loading", () => {
  it("removes the previous program while the next requirements load", async () => {
    getRequirementsFor.mockResolvedValueOnce({
      kind: "prose",
      program_url: "first",
      text: "",
      referenced_courses: ["CPSC 110"],
    });
    usePlanner.setState({ major: "first" });
    render(<ProgramProgress courseIndex={new Map()} plannedCodes={new Set()} />);
    expect(await screen.findByText("CPSC 110")).not.toBeNull();
    getRequirementsFor.mockReturnValue(new Promise(() => {}));
    act(() => usePlanner.setState({ major: "second" }));
    expect(screen.getByRole("status", { name: "Loading requirements…" })).not.toBeNull();
    expect(screen.queryByText("CPSC 110")).toBeNull();
  });

  it.each(["missing", "failed"])("settles %s requirements instead of keeping a skeleton", async (outcome) => {
    usePlanner.setState({ major: "unknown" });
    if (outcome === "missing") getRequirementsFor.mockResolvedValue(null);
    else getRequirementsFor.mockRejectedValue(new Error("offline"));
    const { container } = render(<ProgramProgress courseIndex={new Map()} plannedCodes={new Set()} />);
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    expect(container.querySelector("[data-skeleton]")).toBeNull();
    expect(
      outcome === "failed" ? screen.getByRole("alert") : screen.getByText(/No requirements are available/),
    ).not.toBeNull();
  });
});
