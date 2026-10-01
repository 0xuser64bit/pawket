// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchPetsOnChain = vi.fn();
vi.mock("@/lib/solana/accounts", () => ({ fetchPetsOnChain, fetchPetOnChain: vi.fn() }));

describe("readAllPets", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchPetsOnChain.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("shares one scan between callers a few seconds apart", async () => {
    fetchPetsOnChain.mockResolvedValue([]);
    const { readAllPets, ALL_PETS_FRESH_MS } = await import("./solana");
    await Promise.all([readAllPets(), readAllPets()]);
    vi.advanceTimersByTime(ALL_PETS_FRESH_MS - 1);
    await readAllPets();
    expect(fetchPetsOnChain).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    await readAllPets();
    expect(fetchPetsOnChain).toHaveBeenCalledTimes(2);
  });

  it("never keeps a failed scan", async () => {
    fetchPetsOnChain.mockRejectedValueOnce(new Error("429")).mockResolvedValue([]);
    const { readAllPets } = await import("./solana");
    await expect(readAllPets()).rejects.toThrow("429");
    await expect(readAllPets()).resolves.toEqual([]);
    expect(fetchPetsOnChain).toHaveBeenCalledTimes(2);
  });
});
