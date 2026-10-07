import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyPattern } from "@/lib/play/copy";
import { dealPairs } from "@/lib/play/pairs";
import { CopyGame } from "./copy-game";
import { PairsGame, facesFor } from "./pairs-game";
import { WEARABLES } from "@/lib/closet/catalog";

const look = { form: "cat" as const, temper: "cozy" as const, wearing: null, seed: 42 };
const beans = ["Sun bean (1)", "Pool bean (2)", "Sprout bean (3)", "Copper bean (4)"];
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("round lifecycle", () => {
  it("locks Copy input as soon as the pattern is complete", () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    render(<CopyGame {...look} sky="warm" onFinish={finish} />);
    fireEvent.click(screen.getByRole("button", { name: "Start copying" }));
    act(() => vi.advanceTimersByTime(2000));
    const correct = screen.getByRole("button", { name: beans[copyPattern(42, 1)[0]] });
    fireEvent.click(correct);
    for (const name of beans) expect(screen.getByRole("button", { name })).toBeDisabled();
    fireEvent.click(correct);
    act(() => vi.advanceTimersByTime(700));
    expect(screen.getByText("Watch. 2 beans.")).toBeInTheDocument();
    expect(finish).not.toHaveBeenCalled();
  });

  it("replays the same Copy pattern after a pause and finishes a miss only once", () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    const game = render(<CopyGame {...look} sky="warm" onFinish={finish} />);
    fireEvent.click(screen.getByRole("button", { name: "Start copying" }));
    act(() => vi.advanceTimersByTime(600));
    game.rerender(<CopyGame {...look} sky="warm" onFinish={finish} paused />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("button", { name: beans[0] })).toBeDisabled();
    game.rerender(<CopyGame {...look} sky="warm" onFinish={finish} />);
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(screen.getByRole("button", { name: beans[(copyPattern(42, 1)[0] + 1) % 4] }));
    act(() => vi.advanceTimersByTime(1100));
    expect(finish).toHaveBeenCalledExactlyOnceWith(0);
    const again = vi.fn();
    game.rerender(<CopyGame {...look} sky="warm" onFinish={again} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(again).not.toHaveBeenCalled();
  });

  it("Pairs delivers its result after a paused completion, even when the callback changes", () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    const game = render(<PairsGame {...look} onFinish={finish} />);
    const { cards } = dealPairs(42);
    const buttons = screen.getAllByRole("button");
    for (let face = 0; face < 6; face++) {
      fireEvent.click(buttons[cards.indexOf(face)]);
      fireEvent.click(buttons[cards.lastIndexOf(face)]);
    }
    game.rerender(<PairsGame {...look} onFinish={finish} paused />);
    act(() => vi.advanceTimersByTime(1000));
    expect(finish).not.toHaveBeenCalled();
    const resumed = vi.fn();
    game.rerender(<PairsGame {...look} onFinish={resumed} />);
    act(() => vi.advanceTimersByTime(500));
    expect(resumed).toHaveBeenCalledExactlyOnceWith(60);
    game.rerender(<PairsGame {...look} onFinish={finish} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(finish).not.toHaveBeenCalled();
  });
});

describe("Pairs faces", () => {
  it("deals six pieces of six different kinds, so no two pairs look alike", () => {
    const kindOf = new Map(WEARABLES.map((item) => [item.id, item.kind]));
    for (let seed = 0; seed < 300; seed++) {
      const faces = facesFor(seed);
      expect(faces).toHaveLength(6);
      expect(new Set(faces.map((id) => kindOf.get(id))).size).toBe(6);
    }
  });
});
