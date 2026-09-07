// @vitest-environment happy-dom
import { UserMenu } from "@/src/components/shell/user-menu";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/components/auth/app-auth", () => ({
  useAppAuth: () => ({ user: { username: "max", userId: "1" }, signOut: () => {} }),
}));
vi.mock("@/src/components/providers", () => ({
  useTheme: () => ({ mode: "system", setMode: vi.fn() }),
}));
vi.mock("@/src/components/shell/session-sidebar", () => ({ VersionBadge: () => null }));

afterEach(cleanup);

describe("UserMenu", () => {
  it("links to /settings and cycles menu items with arrow keys", () => {
    const { getByRole, getAllByRole } = render(<UserMenu />);
    fireEvent.click(getByRole("button", { name: "Account menu" }));

    expect(getByRole("menuitem", { name: "Settings" }).getAttribute("href")).toBe("/settings");

    const items = getAllByRole("menuitem");
    expect(items).toHaveLength(2);
    fireEvent.keyDown(getByRole("menu"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[1]);
  });

  it("keeps appearance arrow keys inside the radio group", () => {
    const { getByRole } = render(<UserMenu />);
    fireEvent.click(getByRole("button", { name: "Account menu" }));
    const auto = getByRole("radio", { name: "Auto" });
    auto.focus();
    fireEvent.keyDown(auto, { key: "ArrowDown" });
    expect(document.activeElement).toBe(getByRole("radio", { name: "Dark" }));
  });
});
