// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ToolResultCard,
  ToolResultFailure,
  ToolResultList,
  toolResultRowClasses,
  ToolResultRowContent,
} from "./tool-result-card";

describe("tool result primitives", () => {
  it("shares summary typography, preserves zero metadata, and allows actions to wrap", () => {
    const { getByText, getByRole } = render(
      <ToolResultCard
        icon="building1"
        title="Learning Centre"
        metadata={0}
        detail="No rooms listed"
        action={<a href="/tools/map">Show on map</a>}
      />,
    );
    expect(getByText("Learning Centre").className).toContain("text-base");
    expect(getByText("Learning Centre").parentElement?.className).toContain("gap-1");
    expect(getByText("0").className).toContain("text-muted");
    expect(getByText("No rooms listed").className).toContain("text-on-surface-variant");
    expect(getByRole("link").parentElement?.className).toContain("flex-wrap");
  });

  it("omits unused summary rows", () => {
    const { getByText, queryByRole } = render(<ToolResultCard icon="map" title="Campus map" />);
    expect(getByText("Campus map").parentElement?.childElementCount).toBe(1);
    expect(queryByRole("button")).toBeNull();
  });

  it("shares list, row, and metadata anatomy without changing native semantics", () => {
    render(
      <ToolResultList header="near IKB" footer="2 more">
        <button type="button" className={toolResultRowClasses(true)}>
          <ToolResultRowContent title="Room 201" description="ICCS" trailing={<span>40 seats</span>} />
        </button>
      </ToolResultList>,
    );
    const row = screen.getByRole("button", { name: /Room 201.*ICCS.*40 seats/ });
    expect(row.className).toContain("min-h-11");
    expect(row.className).toContain("hover:bg-surface-container-high");
    expect(screen.getByText("near IKB")).not.toBeNull();
    expect(screen.getByText("2 more")).not.toBeNull();
  });

  it("preserves safe raw evidence when a rich renderer fails", () => {
    render(<ToolResultFailure name="show_widget" result={{ course: "CPSC 110" }} />);
    expect(screen.getByRole("alert").textContent).toContain("show widget result couldn't be displayed");
    expect(screen.getByText("View raw result")).not.toBeNull();
    expect(screen.getByText(/CPSC 110/)).not.toBeNull();
  });
});
