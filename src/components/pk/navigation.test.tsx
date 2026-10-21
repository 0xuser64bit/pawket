import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NavLink, NavProgress } from "./nav-link";
import { Tabs } from "./tabs";
import { Button } from "./controls";

const navigation = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", async (original) => ({ ...await original<object>(), useLinkStatus: () => navigation }));
afterEach(() => { cleanup(); navigation.pending = false; window.history.replaceState(null, "", "/"); });

it("leaves a link as it is while it navigates, and lights the one bar at the top instead", () => {
  const page = () => (
    <>
      <NavProgress />
      <NavLink href="/guilds">Guilds</NavLink>
    </>
  );
  const view = render(page());
  const bar = document.querySelector(".pk-nav-progress")!;
  expect(bar.hasAttribute("data-on")).toBe(false);
  navigation.pending = true;
  view.rerender(page());
  expect(bar.hasAttribute("data-on")).toBe(true);
  expect(screen.getByRole("link").textContent).toBe("Guilds");
  expect(screen.getByRole("link").getAttribute("href")).toBe("/guilds");
  navigation.pending = false;
  view.rerender(page());
  expect(bar.hasAttribute("data-on")).toBe(false);
});

it("lights a pressed tab at once, and lets the address win once it moves", () => {
  const items = [
    { key: "pets", label: "Pets", href: "/profile#shelf" },
    { key: "wardrobe", label: "Wardrobe", href: "/profile?tab=wardrobe#shelf" },
    { key: "stickers", label: "Stickers", href: "/profile?tab=stickers#shelf" },
  ];
  const view = render(<Tabs label="Shelf" active="pets" items={items} />);
  fireEvent.click(screen.getByRole("tab", { name: "Stickers" }));
  expect(screen.getByRole("tab", { name: "Stickers" }).getAttribute("aria-selected")).toBe("true");
  view.rerender(<Tabs label="Shelf" active="stickers" items={items} />);
  expect(screen.getByRole("tab", { name: "Stickers" }).getAttribute("aria-selected")).toBe("true");
  view.rerender(<Tabs label="Shelf" active="pets" items={items} />);
  expect(screen.getByRole("tab", { name: "Pets" }).getAttribute("aria-selected")).toBe("true");
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
