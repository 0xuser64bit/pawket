import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Address } from "@solana/kit";
import type { ChainEvent, ChainPoll } from "@/lib/solana/accounts";
import { GATHERING_LIMITS } from "@/lib/solana/program";
import { GuildGatherings } from "./gatherings";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/companion/use-companion", () => ({
  useCompanion: () => ({
    ready: true, owner: "owner", canSign: true,
    owned: [{ pet: { address: "pet", name: "Miso" }, member: { guild: "guild" } }],
  }),
}));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: {} }));
vi.mock("@/lib/solana/use-send", () => ({
  usePawketSend: () => ({ busy: false, act: vi.fn() }),
  useSponsor: () => ({ data: { available: true } }),
  rentWaits: () => false,
}));
vi.mock("@solana/react", () => ({
  useRequest: () => ({ data: { rsvps: [{ event: "event", pet: "pet", came: false }], voted: new Map() }, refresh: vi.fn() }),
}));

const initial = Date.UTC(2026, 9, 30, 12) / 1000;
const guild = { address: "guild", name: "Cloud Nine", founderPet: "other-pet" };
const event: ChainEvent = {
  address: "event" as Address, guild: "guild" as Address, creator: "owner" as Address,
  id: 0, createdAt: initial, startsAt: initial + GATHERING_LIMITS.checkInEarlySeconds + 60,
  endsAt: initial + GATHERING_LIMITS.checkInEarlySeconds + 120,
  going: 1, came: 0, title: "Cloud picnic", note: "",
};
const poll: ChainPoll = {
  address: "poll" as Address, guild: "guild" as Address, creator: "owner" as Address,
  id: 0, createdAt: initial, closesAt: initial + 120,
  votes: [0, 0], question: "Where next?", options: ["Garden", "Beach"],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(initial * 1000);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("shows check-in exactly when the early window opens without polling each second", () => {
  const timers = vi.spyOn(window, "setTimeout");
  const intervals = vi.spyOn(window, "setInterval");
  render(<GuildGatherings guild={guild} events={[event]} polls={[]} />);
  expect(screen.queryByRole("button", { name: "Check in Miso" })).toBeNull();
  const scheduled = timers.mock.calls.length;
  act(() => vi.advanceTimersByTime(59_999));
  expect(timers.mock.calls).toHaveLength(scheduled);
  expect(intervals).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Check in Miso" })).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("button", { name: "Check in Miso" })).toBeEnabled();
  expect(vi.getTimerCount()).toBe(1);
});

it("moves an event into Before at endsAt and removes check-in", () => {
  vi.setSystemTime((event.endsAt - 1) * 1000);
  render(<GuildGatherings guild={guild} events={[event]} polls={[]} />);
  expect(screen.getByRole("button", { name: "Check in Miso" })).toBeEnabled();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole("heading", { name: event.title })).toBeNull();
  expect(screen.queryByRole("button", { name: "Check in Miso" })).toBeNull();
  expect(screen.getByText("Before: Cloud picnic (0 came)")).toBeVisible();
});

it("closes a poll exactly at closesAt and no longer offers voting", () => {
  render(<GuildGatherings guild={guild} events={[]} polls={[poll]} />);
  expect(screen.getByRole("button", { name: "Vote Garden, 0 so far" })).toBeEnabled();
  act(() => vi.advanceTimersByTime(119_999));
  expect(screen.getByRole("button", { name: "Vote Garden, 0 so far" })).toBeEnabled();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByText("Closed")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Vote / })).toBeNull();
});

it.each(["focus", "visibilitychange"])("catches up after %s without waiting for a suspended timer", (resume) => {
  render(<GuildGatherings guild={guild} events={[event]} polls={[poll]} />);
  vi.setSystemTime((event.startsAt - GATHERING_LIMITS.checkInEarlySeconds) * 1000);
  if (resume === "focus") fireEvent.focus(window);
  else {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
  }
  expect(screen.getByRole("button", { name: "Check in Miso" })).toBeEnabled();
  vi.setSystemTime(event.endsAt * 1000);
  if (resume === "focus") fireEvent.focus(window);
  else fireEvent(document, new Event("visibilitychange"));
  expect(screen.getByText("Closed")).toBeVisible();
  expect(screen.getByText("Before: Cloud picnic (0 came)")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Vote |Check in/ })).toBeNull();
});

it("reschedules when event or poll data changes and cleans up timers and resume listeners", () => {
  const windowAdd = vi.spyOn(window, "addEventListener");
  const documentAdd = vi.spyOn(document, "addEventListener");
  const windowRemove = vi.spyOn(window, "removeEventListener");
  const documentRemove = vi.spyOn(document, "removeEventListener");
  const view = render(<GuildGatherings guild={guild} events={[event]} polls={[poll]} />);
  view.rerender(<GuildGatherings guild={guild} events={[]} polls={[{ ...poll, closesAt: initial + 5 }]} />);
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText("Closed")).toBeVisible();
  expect(vi.getTimerCount()).toBe(0);
  view.rerender(<GuildGatherings guild={guild} events={[event]} polls={[poll]} />);
  expect(vi.getTimerCount()).toBe(1);
  const focus = windowAdd.mock.calls.findLast(([type]) => type === "focus")![1];
  const visibility = documentAdd.mock.calls.findLast(([type]) => type === "visibilitychange")![1];
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(windowRemove).toHaveBeenCalledWith("focus", focus);
  expect(documentRemove).toHaveBeenCalledWith("visibilitychange", visibility);
});

it("does not refresh on a hidden visibility change, but catches up once visible", () => {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  render(<GuildGatherings guild={guild} events={[]} polls={[poll]} />);
  vi.setSystemTime(poll.closesAt * 1000);
  fireEvent(document, new Event("visibilitychange"));
  expect(screen.getByRole("button", { name: "Vote Garden, 0 so far" })).toBeEnabled();
  visibility.mockReturnValue("visible");
  fireEvent(document, new Event("visibilitychange"));
  expect(screen.getByText("Closed")).toBeVisible();
  expect(vi.getTimerCount()).toBe(0);
});

it("caps distant boundaries at the browser timer limit without closing early", () => {
  const closesAt = initial + 30 * 86_400;
  render(<GuildGatherings guild={guild} events={[]} polls={[{ ...poll, closesAt }]} />);
  act(() => vi.advanceTimersByTime(2_147_483_647));
  expect(screen.getByRole("button", { name: "Vote Garden, 0 so far" })).toBeEnabled();
  expect(vi.getTimerCount()).toBe(1);
  act(() => vi.advanceTimersByTime((closesAt - initial) * 1000 - 2_147_483_647));
  expect(screen.getByText("Closed")).toBeVisible();
  expect(vi.getTimerCount()).toBe(0);
});
