import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NavLink } from "./nav-link";
import { Tabs } from "./tabs";
import { Button } from "./controls";

const navigation = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", async (original) => ({ ...await original<object>(), useLinkStatus: () => navigation }));
afterEach(() => { cleanup(); navigation.pending = false; window.history.replaceState(null, "", "/"); });

it("shows an accessible wait only while its link is navigating", () => {
  const view = render(<NavLink href="/guilds">Guilds</NavLink>);
  expect(screen.queryByRole("status")).toBeNull();
  navigation.pending = true;
  view.rerender(<NavLink href="/guilds">Guilds</NavLink>);
  expect(screen.getByRole("status").textContent).toContain("Opening page");
  expect(screen.getByRole("link").getAttribute("href")).toBe("/guilds");
});

it("switches panels through local history and supports arrow keys", () => {
  const push = vi.spyOn(window.history, "pushState");
  render(<Tabs label="Shelf" active="pets" items={[
    { key: "pets", label: "Pets", href: "/profile#shelf" },
    { key: "wardrobe", label: "Wardrobe", href: "/profile?tab=wardrobe#shelf" },
  ]} />);
  fireEvent.keyDown(screen.getByRole("tab", { name: "Pets" }), { key: "ArrowRight" });
  expect(window.location.search).toBe("?tab=wardrobe");
  expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Wardrobe" }));
  fireEvent.keyDown(document.activeElement!, { key: "Home" });
  expect(window.location.search).toBe("");
  expect(push).toHaveBeenCalledTimes(2);
  push.mockRestore();
});

it("acknowledges an action that is opening another page and blocks duplicate presses", () => {
  const click = vi.fn();
  render(<Button label="Take them home" busy onClick={click} />);
  const button = screen.getByRole("button", { name: "Take them home" });
  expect(button.getAttribute("aria-busy")).toBe("true");
  fireEvent.click(button);
  expect(click).not.toHaveBeenCalled();
});
