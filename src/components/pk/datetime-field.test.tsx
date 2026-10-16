import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DateTimeField, TimeField } from "./datetime-field";
import { localMinute, parseLocalMinute } from "@/lib/utils/local-datetime";

vi.mock("@/lib/native/android", () => ({ useBackCloses: () => {} }));
afterEach(cleanup);

/** An hour chip, on a twelve- or a twenty-four-hour clock. */
function pickHour(hour24: number) {
  const hours = within(screen.getByRole("radiogroup", { name: "Hour" }));
  const twelve = screen.queryByRole("radiogroup", { name: "Morning or afternoon" });
  if (!twelve) return fireEvent.click(hours.getByRole("radio", { name: String(hour24).padStart(2, "0") }));
  fireEvent.click(hours.getByRole("radio", { name: String(hour24 % 12 || 12) }));
  fireEvent.click(within(twelve).getByRole("radio", { name: hour24 >= 12 ? "PM" : "AM" }));
}

it("rejects impossible dates and times instead of silently rolling them over", () => {
  for (const value of ["2030-02-30T12:00", "2030-01-01T24:00", "2030-01-01T12:60", "bad", ""]) expect(parseLocalMinute(value)).toBeNull();
  expect(localMinute(parseLocalMinute("2032-02-29T15:45")!)).toBe("2032-02-29T15:45");
});

it("moves across a year with the keyboard, takes the time as chips, and commits only on confirmation", () => {
  const change = vi.fn();
  render(<DateTimeField label="Starts" value="2030-12-31T15:45" onChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: /Starts/ }));
  fireEvent.keyDown(screen.getByRole("gridcell", { selected: true }).querySelector("button")!, { key: "ArrowRight" });
  expect(screen.getByRole("gridcell", { selected: true }).textContent).toBe("1");
  pickHour(16);
  fireEvent.click(screen.getByRole("radio", { name: ":30" }));
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Use this time" }));
  expect(change).toHaveBeenCalledWith("2031-01-01T16:30");
});

it("keeps the past out of reach and a passed time from being confirmed", () => {
  render(<DateTimeField label="Starts" value="2000-01-01T15:45" onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /Starts/ }));
  expect(screen.getByRole("button", { name: "Use this time" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("That time has passed");
  expect((screen.getByRole("gridcell", { selected: true }).querySelector("button") as HTMLButtonElement).disabled).toBe(true);
  // A month on lands on the soonest day there is, never further back.
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect((screen.getByRole("gridcell", { selected: true }).querySelector("button") as HTMLButtonElement).disabled).toBe(false);
});

it("chooses a daily time the same way, as chips", () => {
  const change = vi.fn();
  render(<TimeField label="Remind me daily at" value="19:00" onChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: /Remind me daily at/ }));
  pickHour(8);
  fireEvent.click(screen.getByRole("radio", { name: ":15" }));
  fireEvent.click(screen.getByRole("button", { name: "Use this time" }));
  expect(change).toHaveBeenCalledWith("08:15");
});
