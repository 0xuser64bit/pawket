import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const reads = vi.hoisted(() => ({ pets: vi.fn(), guilds: vi.fn() }));
vi.mock("@/server/solana", () => ({ readAllPets: reads.pets, readGuilds: reads.guilds }));
import ParkPage from "./page";

afterEach(() => vi.resetAllMocks());

it("starts the independent guild scan before the pet scan finishes", async () => {
  let finishPets!: (pets: []) => void;
  reads.pets.mockReturnValue(new Promise<[]>((resolve) => { finishPets = resolve; }));
  reads.guilds.mockResolvedValue([]);
  const pending = ParkPage({ searchParams: Promise.resolve({}) });
  try {
    await waitFor(() => expect(reads.guilds).toHaveBeenCalledOnce());
  } finally {
    finishPets([]);
  }
  render(await pending);
  expect(screen.getByRole("heading", { name: "Park", level: 1 })).toBeVisible();
  expect(screen.getByText("Nobody is out yet")).toBeVisible();
});

it("keeps pet discovery available when the optional guild read fails", async () => {
  reads.pets.mockResolvedValue([]);
  reads.guilds.mockRejectedValue(new Error("Guild RPC unavailable"));
  render(await ParkPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText("Nobody is out yet")).toBeVisible();
});
