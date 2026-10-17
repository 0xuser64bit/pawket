import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dismissToast, showToast, Toasts } from "./toast";

const cards = () => Array.from(document.querySelectorAll<HTMLElement>(".pk-toast"));
const depth = (title: string) => screen.getByText(title).closest(".pk-toast")!.getAttribute("data-depth");

beforeEach(() => vi.useFakeTimers());
// The store is the page's: each test dismisses what it shows, and the timers let it go.
afterEach(() => {
  act(() => vi.runAllTimers());
  cleanup();
  vi.useRealTimers();
});

function show(...titles: string[]) {
  act(() => titles.forEach((title) => showToast({ id: title, tone: "done", title })));
}

it("keeps the newest in front and at most three, the rest tucked behind it", () => {
  render(<Toasts />);
  show("one", "two", "three", "four");
  expect(cards().map((card) => card.textContent)).toEqual(["two", "three", "four"]);
  expect([depth("four"), depth("three"), depth("two")]).toEqual(["0", "1", "2"]);
  expect(document.querySelector(".pk-toasts")!.hasAttribute("data-open")).toBe(false);
  for (const title of ["two", "three", "four"]) dismissToast(title);
  act(() => vi.runAllTimers());
});

it("never pushes out a send that is still waiting for a newer word", () => {
  render(<Toasts />);
  act(() => showToast({ id: "waiting", tone: "wait", title: "Feed Mango: still waiting" }));
  show("one", "two", "three");
  expect(cards().map((card) => card.textContent)).toEqual(["Feed Mango: still waiting", "two", "three"]);
  for (const title of ["waiting", "two", "three"]) dismissToast(title);
  act(() => vi.runAllTimers());
});

it("leaves before it is gone, and a tap fans the stack out", () => {
  render(<Toasts />);
  show("older", "newer");
  const front = screen.getByText("newer").closest(".pk-toast")!;
  fireEvent.pointerDown(front, { pointerType: "touch", pointerId: 1, clientX: 50, clientY: 50 });
  fireEvent.pointerUp(front, { pointerType: "touch", pointerId: 1, clientX: 51, clientY: 50 });
  expect(document.querySelector(".pk-toasts")!.hasAttribute("data-open")).toBe(true);
  fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[1]);
  expect(front.hasAttribute("data-leaving")).toBe(true);
  expect(depth("older")).toBe("0");
  act(() => vi.advanceTimersByTime(200));
  expect(cards().map((card) => card.textContent)).toEqual(["older"]);
  dismissToast("older");
  act(() => vi.runAllTimers());
});

it("goes when a finger flicks it up or aside, and springs back from a nudge", () => {
  render(<Toasts />);
  show("flick me");
  const card = screen.getByText("flick me").closest(".pk-toast") as HTMLElement;
  fireEvent.pointerDown(card, { pointerType: "touch", pointerId: 2, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(card, { pointerType: "touch", pointerId: 2, clientX: 130, clientY: 100 });
  expect(card.style.translate).toBe("30px 0px");
  fireEvent.pointerUp(card, { pointerType: "touch", pointerId: 2, clientX: 130, clientY: 100 });
  expect(card.style.translate).toBe("");
  expect(card.hasAttribute("data-leaving")).toBe(false);
  fireEvent.pointerDown(card, { pointerType: "touch", pointerId: 3, clientX: 100, clientY: 100 });
  fireEvent.pointerUp(card, { pointerType: "touch", pointerId: 3, clientX: 100, clientY: 40 });
  expect(card.hasAttribute("data-leaving")).toBe(true);
});

it("is one live region, so a toast is said once, a refusal included", () => {
  render(<Toasts />);
  act(() => showToast({ id: "refused", tone: "risk", title: "Feed Mango: refused" }));
  show("kept");
  expect(document.querySelector(".pk-toasts")!.getAttribute("aria-live")).toBe("polite");
  expect(document.querySelectorAll(".pk-toasts [aria-live], .pk-toasts [role=status], .pk-toasts [role=alert]")).toHaveLength(0);
  for (const title of ["refused", "kept"]) dismissToast(title);
  act(() => vi.runAllTimers());
});
