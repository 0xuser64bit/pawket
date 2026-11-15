import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Choice } from "./choice";
import { Sheet } from "./sheet";
import { dismissToast, showToast, Toasts } from "./toast";

vi.mock("@/lib/native/android", () => ({ useBackCloses: () => {} }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(max-width: 719px)" }));
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([new DOMRect(0, 0, 100, 44)] as unknown as DOMRectList);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(300);
  vi.stubGlobal("PointerEvent", MouseEvent);
});
afterEach(() => {
  act(() => {
    dismissToast("sheet-receipt");
    vi.runAllTimers();
  });
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("cancels a dismissal-sized header drag without closing the sheet", () => {
  const closed = vi.fn();
  render(<Sheet title="Choose" onDismiss={closed}>Contents</Sheet>);
  const dialog = screen.getByRole("dialog");
  dialog.setPointerCapture = vi.fn();
  const header = dialog.querySelector("header")!;
  fireEvent.pointerDown(header, { button: 0, clientY: 100 });
  fireEvent.pointerMove(dialog, { clientY: 250 });
  expect(dialog.style.transform).toBe("translateY(150px)");
  fireEvent.pointerCancel(dialog, { clientY: 250 });
  expect(dialog.style.transform).toBe("");
  expect(dialog.style.transition).toBe("");
  expect(dialog.parentElement!.style.getPropertyValue("--pk-drag")).toBe("");
  act(() => vi.advanceTimersByTime(500));
  expect(closed).not.toHaveBeenCalled();
  expect(dialog).toBeInTheDocument();
});

it("still dismisses a completed downward header drag", () => {
  const closed = vi.fn();
  render(<Sheet title="Choose" onDismiss={closed}>Contents</Sheet>);
  const dialog = screen.getByRole("dialog");
  dialog.setPointerCapture = vi.fn();
  fireEvent.pointerDown(dialog.querySelector("header")!, { button: 0, clientY: 100 });
  fireEvent.pointerMove(dialog, { clientY: 250 });
  fireEvent.pointerUp(dialog, { clientY: 250 });
  act(() => vi.advanceTimersByTime(500));
  expect(closed).toHaveBeenCalledOnce();
});

function ChoiceSheet() {
  const [value, setValue] = useState("bright");
  return (
    <Sheet title="Choose a mood" onDismiss={() => {}}>
      <button>Before choice</button>
      <Choice label="Mood" options={[
        { value: "quiet", label: "Quiet" },
        { value: "bright", label: "Bright" },
        { value: "playful", label: "Playful" },
      ]} value={value} onPick={setValue} />
      <button>After choice</button>
    </Sheet>
  );
}

it.each([false, true])("keeps a real roving Choice to one Tab stop (shiftKey=%s)", (shiftKey) => {
  render(<ChoiceSheet />);
  const entry = screen.getByRole("button", { name: shiftKey ? "After choice" : "Before choice" });
  const exit = screen.getByRole("button", { name: shiftKey ? "Before choice" : "After choice" });
  const selected = screen.getByRole("radio", { name: "Bright" });
  act(() => entry.focus());
  fireEvent.keyDown(entry, { key: "Tab", shiftKey });
  expect(selected).toHaveFocus();
  fireEvent.keyDown(selected, { key: "Tab", shiftKey });
  expect(exit).toHaveFocus();

  act(() => selected.focus());
  fireEvent.keyDown(selected, { key: "ArrowRight" });
  const next = screen.getByRole("radio", { name: "Playful" });
  expect(next).toHaveFocus();
  expect(next).toHaveAttribute("aria-checked", "true");
  act(() => entry.focus());
  fireEvent.keyDown(entry, { key: "Tab", shiftKey });
  expect(next).toHaveFocus();
  fireEvent.keyDown(next, { key: "Tab", shiftKey });
  expect(exit).toHaveFocus();
});

it("includes toast links and dismissal in the modal Tab loop while keeping the background inert", () => {
  const behind = render(<button>Background action</button>);
  const toastLayer = document.createElement("div");
  toastLayer.dataset.toasts = "";
  document.body.append(toastLayer);
  render(<Toasts />, { container: toastLayer });
  render(<Sheet title="Wallet" onDismiss={() => {}}><button>Last sheet action</button></Sheet>);
  act(() => showToast({ id: "sheet-receipt", tone: "done", title: "Saved receipt", body: <a href="#explorer">Explorer receipt</a> }));
  const last = screen.getByRole("button", { name: "Last sheet action" });
  const link = screen.getByRole("link", { name: "Explorer receipt" });
  act(() => last.focus());
  fireEvent.keyDown(last, { key: "Tab" });
  expect(link).toHaveFocus();
  fireEvent.keyDown(link, { key: "Tab" });
  const close = screen.getByRole("button", { name: "Dismiss" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: "Tab" });
  expect(screen.getByRole("button", { name: "Close Wallet" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
  expect(close).toHaveFocus();
  expect((behind.container as HTMLElement).inert).toBe(true);
  expect(toastLayer.inert).not.toBe(true);
  toastLayer.remove();
});

it("returns focus to the open sheet when its last focused receipt is dismissed", () => {
  const toastLayer = document.createElement("div");
  toastLayer.dataset.toasts = "";
  document.body.append(toastLayer);
  render(<Toasts />, { container: toastLayer });
  render(<Sheet title="Wallet" onDismiss={() => {}}>Wallet contents</Sheet>);
  act(() => showToast({ id: "sheet-receipt", tone: "done", title: "Saved receipt" }));
  const close = screen.getByRole("button", { name: "Dismiss" });
  act(() => close.focus());
  fireEvent.click(close);
  act(() => vi.advanceTimersByTime(200));
  expect(screen.getByRole("dialog")).toHaveFocus();
  toastLayer.remove();
});
