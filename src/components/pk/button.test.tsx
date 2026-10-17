import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Button } from "./controls";

it("an unavailable button keeps its focus and ignores every press", () => {
  const press = vi.fn();
  const { rerender } = render(<Button label="Feed" onClick={press} />);
  const button = screen.getByRole("button", { name: "Feed" });
  button.focus();
  rerender(<Button label="Feed" onClick={press} busy />);
  expect(document.activeElement).toBe(button);
  expect(button.getAttribute("aria-disabled")).toBe("true");
  expect(button.hasAttribute("disabled")).toBe(false);
  fireEvent.click(button);
  rerender(<Button label="Feed" onClick={press} disabled />);
  fireEvent.click(button);
  expect(press).not.toHaveBeenCalled();
  rerender(<Button label="Feed" onClick={press} />);
  fireEvent.click(button);
  expect(press).toHaveBeenCalledOnce();
  expect(button.hasAttribute("aria-disabled")).toBe(false);
});
