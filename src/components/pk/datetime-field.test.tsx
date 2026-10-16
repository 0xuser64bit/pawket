import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DateTimeField } from "./datetime-field";
import { localMinute, parseLocalMinute } from "@/lib/utils/local-datetime";

vi.mock("@/lib/native/android", () => ({ useBackCloses: () => {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("rejects impossible dates and times instead of silently rolling them over", () => {
  for (const value of ["2030-02-30T12:00", "2030-01-01T24:00", "2030-01-01T12:60", "bad", ""]) expect(parseLocalMinute(value)).toBeNull();
  expect(localMinute(parseLocalMinute("2032-02-29T15:45")!)).toBe("2032-02-29T15:45");
});

it("moves across a year with the keyboard and only commits on confirmation", () => {
  const change = vi.fn();
  render(<DateTimeField label="Starts" value="2030-12-31T15:45" onChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: /Starts/ }));
  const selected = screen.getByRole("gridcell", { selected: true }).querySelector("button")!;
  fireEvent.keyDown(selected, { key: "ArrowRight" });
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByRole("gridcell", { selected: true }).textContent).toBe("1");
  fireEvent.change(screen.getByLabelText("Hour (0–23)"), { target: { value: "16" } });
  fireEvent.click(screen.getByRole("button", { name: "Use this time" }));
  expect(change).toHaveBeenCalledWith("2031-01-01T16:45");
});

it("keeps an invalid or past time from being confirmed", () => {
  render(<DateTimeField label="Starts" value="2000-01-01T15:45" onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Starts/ }));
  expect(screen.getByRole("button", { name: "Use this time" }).hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByLabelText("Minute (0–59)"), { target: { value: "99" } });
  expect(screen.getByRole("status").textContent).toContain("Choose a valid time");
});
