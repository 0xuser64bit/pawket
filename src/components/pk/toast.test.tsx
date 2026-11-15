import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { txToast } from "@/components/wallet/tx-toast";
import { dismissToast, showToast, Toasts, type Toast } from "./toast";

const cards = () => Array.from(document.querySelectorAll<HTMLElement>(".pk-toast"));
const depth = (title: string) => screen.getByText(title).closest(".pk-toast")!.getAttribute("data-depth");

const issued = new Set<string>();
function post(toast: Toast) {
  issued.add(toast.id);
  showToast(toast);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  act(() => {
    for (const id of issued) dismissToast(id);
    vi.runAllTimers();
  });
  issued.clear();
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function show(...titles: string[]) {
  act(() => titles.forEach((title) => post({ id: title, tone: "done", title })));
}

it("is one live region from before the first toast, and no toast nests another", () => {
  render(<Toasts />);
  const region = document.querySelector(".pk-toasts")!;
  expect(region.getAttribute("aria-live")).toBe("polite");
  act(() => {
    post({ id: "saved", tone: "done", title: "Saved" });
    post({ id: "refused", tone: "risk", title: "Refused" });
    post({ id: "waiting", tone: "wait", title: "Still waiting" });
  });
  expect(cards()).toHaveLength(3);
  expect(region.querySelectorAll("[aria-live], [role=alert], [role=status], [role=log]")).toHaveLength(0);
  for (const id of ["saved", "refused", "waiting"]) dismissToast(id);
  act(() => vi.runAllTimers());
});

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
  act(() => post({ id: "waiting", tone: "wait", title: "Feed Mango: still waiting" }));
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
  act(() => post({ id: "refused", tone: "risk", title: "Feed Mango: refused" }));
  show("kept");
  expect(document.querySelector(".pk-toasts")!.getAttribute("aria-live")).toBe("polite");
  expect(document.querySelectorAll(".pk-toasts [aria-live], .pk-toasts [role=status], .pk-toasts [role=alert]")).toHaveLength(0);
  for (const title of ["refused", "kept"]) dismissToast(title);
  act(() => vi.runAllTimers());
});

it("counts only unhovered reading time toward expiry", () => {
  render(<Toasts />);
  act(() => post({ id: "hover", tone: "note", title: "Read this", ttl: 1_000 }));
  act(() => vi.advanceTimersByTime(400));
  const region = document.querySelector(".pk-toasts")!;
  fireEvent.pointerEnter(region, { pointerType: "mouse" });
  act(() => vi.advanceTimersByTime(5_000));
  expect(screen.getByText("Read this").closest(".pk-toast")).not.toHaveAttribute("data-leaving");
  fireEvent.pointerLeave(region, { pointerType: "mouse" });
  act(() => vi.advanceTimersByTime(599));
  expect(screen.getByText("Read this").closest(".pk-toast")).not.toHaveAttribute("data-leaving");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText("Read this").closest(".pk-toast")).toHaveAttribute("data-leaving");
});

it("pauses a focused receipt and does not fold it on pointer leave or an outside tap", () => {
  render(<><button>Elsewhere</button><Toasts /></>);
  act(() => post({ id: "focus", tone: "note", title: "Read the receipt", ttl: 1_000, body: <a href="#receipt">Receipt</a> }));
  act(() => screen.getByRole("link", { name: "Receipt" }).focus());
  show("newer");
  const region = document.querySelector(".pk-toasts")!;
  fireEvent.pointerLeave(region, { pointerType: "mouse" });
  fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));
  expect(region).toHaveAttribute("data-open");
  act(() => vi.advanceTimersByTime(5_000));
  expect(screen.getByRole("link", { name: "Receipt" })).toHaveFocus();
  act(() => screen.getByRole("button", { name: "Elsewhere" }).focus());
  act(() => dismissToast("newer"));
  act(() => vi.advanceTimersByTime(999));
  expect(screen.getByText("Read the receipt").closest(".pk-toast")).not.toHaveAttribute("data-leaving");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText("Read the receipt").closest(".pk-toast")).toHaveAttribute("data-leaving");
});

it("pauses expiry while the document is hidden, including a toast posted in the background", () => {
  let hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  render(<Toasts />);
  act(() => post({ id: "hidden", tone: "note", title: "Background receipt", ttl: 1_000 }));
  act(() => vi.advanceTimersByTime(400));
  hidden = true;
  fireEvent(document, new Event("visibilitychange"));
  act(() => vi.advanceTimersByTime(5_000));
  expect(screen.getByText("Background receipt")).toBeInTheDocument();
  act(() => post({ id: "hidden-new", tone: "note", title: "Posted while hidden", ttl: 1_000 }));
  act(() => vi.advanceTimersByTime(5_000));
  expect(screen.getByText("Posted while hidden")).toBeInTheDocument();
  hidden = false;
  fireEvent(document, new Event("visibilitychange"));
  act(() => dismissToast("hidden-new"));
  act(() => vi.advanceTimersByTime(599));
  expect(screen.getByText("Background receipt").closest(".pk-toast")).not.toHaveAttribute("data-leaving");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText("Background receipt").closest(".pk-toast")).toHaveAttribute("data-leaving");
});

it("does not spend a covered toast's reading time until it comes to the front", () => {
  render(<Toasts />);
  act(() => post({ id: "covered", tone: "note", title: "Older receipt", ttl: 1_000 }));
  act(() => vi.advanceTimersByTime(400));
  show("cover");
  act(() => vi.advanceTimersByTime(5_000));
  expect(screen.getByText("Older receipt")).toBeInTheDocument();
  act(() => dismissToast("cover"));
  act(() => vi.advanceTimersByTime(599));
  expect(screen.getByText("Older receipt").closest(".pk-toast")).not.toHaveAttribute("data-leaving");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText("Older receipt").closest(".pk-toast")).toHaveAttribute("data-leaving");
});

it("promotes an updated receipt without duplicating it", () => {
  render(<Toasts />);
  show("receipt", "newer");
  act(() => post({ id: "receipt", tone: "risk", title: "Receipt needs attention" }));
  expect(cards()).toHaveLength(2);
  expect(depth("Receipt needs attention")).toBe("0");
});

it("retains deliberately persistent receipts even when more than three arrive", () => {
  render(<Toasts />);
  act(() => {
    for (const id of ["receipt-a", "receipt-b", "receipt-c", "receipt-d"]) {
      post({ id, tone: "done", title: id, persistent: true, ttl: 1_000 });
    }
  });
  show("incidental");
  act(() => vi.advanceTimersByTime(5_000));
  expect(cards().map((card) => card.querySelector(".pk-toast__title")!.textContent)).toEqual(["receipt-a", "receipt-b", "receipt-c", "receipt-d"]);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  act(() => vi.advanceTimersByTime(200));
  expect(screen.queryByText("receipt-d")).toBeNull();
  expect(depth("receipt-c")).toBe("0");
});

it("shows a new transient error in front of three persistent transaction receipts", () => {
  render(<Toasts />);
  const receipts = ["Feed Mango", "Wash Mango", "Rest Mango"];
  act(() => {
    for (const label of receipts) {
      post(txToast(label, { stage: "confirmed", label, signature: "5ig" }, "devnet")!);
    }
  });
  expect(cards()).toHaveLength(3);
  act(() => post({ id: "selection-error", tone: "risk", title: "Could not save your pet selection.", ttl: 6_000 }));
  const error = screen.getByText("Could not save your pet selection.").closest(".pk-toast")!;
  expect(error).toHaveAttribute("data-depth", "0");
  expect(error).not.toHaveAttribute("aria-hidden");
  expect(error).not.toHaveAttribute("data-overflow");
  expect(cards()).toHaveLength(4);
  for (const label of receipts) expect(screen.getByText(label)).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(6_000));
  expect(error).toHaveAttribute("data-leaving");
  act(() => vi.advanceTimersByTime(200));
  expect(screen.queryByText("Could not save your pet selection.")).toBeNull();
  expect(cards()).toHaveLength(3);
});

it("never evicts a toast containing keyboard focus", () => {
  render(<Toasts />);
  act(() => post({ id: "focused", tone: "done", title: "Focused receipt", body: <a href="#focused">Read focused receipt</a> }));
  act(() => screen.getByRole("link", { name: "Read focused receipt" }).focus());
  show("one", "two", "three", "four");
  expect(screen.getByRole("link", { name: "Read focused receipt" })).toHaveFocus();
  expect(document.querySelector(".pk-toasts")).toHaveAttribute("data-open");
});

it("keeps focus when the focused receipt itself is updated and promoted", () => {
  render(<Toasts />);
  act(() => post({ id: "focused-update", tone: "wait", title: "Waiting", body: <a href="#updated">Read this send</a> }));
  act(() => screen.getByRole("link", { name: "Read this send" }).focus());
  show("newer-update");
  const card = screen.getByText("Waiting").closest(".pk-toast")!;
  const neighbor = card.nextElementSibling;
  act(() => post({ id: "focused-update", tone: "done", title: "Confirmed", body: <a href="#updated">Read this send</a> }));
  // Browsers drop focus when a focused subtree is moved; jsdom does not.
  expect(card.nextElementSibling).toBe(neighbor);
  expect(screen.getByRole("link", { name: "Read this send" })).toHaveFocus();
  expect(depth("Confirmed")).toBe("0");
});

it("can open even one tall receipt for touch scrolling", () => {
  render(<Toasts />);
  show("one tall receipt");
  const card = screen.getByText("one tall receipt").closest(".pk-toast")!;
  fireEvent.pointerDown(card, { pointerType: "touch", pointerId: 1, clientX: 50, clientY: 50 });
  fireEvent.pointerUp(card, { pointerType: "touch", pointerId: 1, clientX: 50, clientY: 50 });
  expect(document.querySelector(".pk-toasts")).toHaveAttribute("data-open");
});

it("does not let an old expiry callback dismiss a newly persistent update", () => {
  render(<Toasts />);
  act(() => post({ id: "timer-race", tone: "done", title: "Short note", ttl: 1_000 }));
  act(() => {
    post({ id: "timer-race", tone: "risk", title: "Retained receipt", persistent: true });
    vi.advanceTimersByTime(1_000);
  });
  expect(screen.getByText("Retained receipt").closest(".pk-toast")).not.toHaveAttribute("data-leaving");
});
