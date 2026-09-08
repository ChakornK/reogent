// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AssistantMessage } from "./message";

vi.mock("@/src/components/chat/tool-renderers", () => ({ ResponseWidget: () => null }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => true,
}));

afterEach(cleanup);

it("keeps thinking text mounted across native disclosure toggles and stream updates", () => {
  const view = (content: string) => (
    <AssistantMessage
      message={{ id: "m1", role: "assistant", content: "", activity: [{ type: "thinking", content }] }}
    />
  );
  const { container, getByText, rerender } = render(view("Checking prerequisites"));
  const details = container.querySelector("details")!;
  const body = getByText("Checking prerequisites");
  expect(details.open).toBe(false);
  act(() => {
    details.open = true;
    fireEvent(details, new Event("toggle"));
  });
  expect(getByText("Checking prerequisites")).toBe(body);
  act(() => {
    details.open = false;
    fireEvent(details, new Event("toggle"));
  });
  expect(getByText("Checking prerequisites")).toBe(body);
  rerender(view("Checking prerequisites and credits"));
  expect(getByText("Checking prerequisites and credits")).toBe(body);
  expect(details.open).toBe(false);
});
