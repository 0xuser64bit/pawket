import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ChainGuild } from "@/lib/solana/accounts";
import { GuildDirectory } from "./directory";

const state = vi.hoisted(() => ({ owner: "owner", owned: [{ member: { guild: "joined" } }] }));
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => state }));
afterEach(cleanup);

it("puts confirmed membership and founded guilds before discovery with explicit labels", () => {
  const make = (address: string, founder = "other") => ({ address, founder, name: address, slug: address, motto: "", crest: 0, colour: 0, createdAt: 1, memberCount: 1 }) as ChainGuild;
  render(<GuildDirectory guilds={[make("other"), make("joined"), make("founded", "owner")]} coins={new Map()} />);
  const yours = screen.getByRole("region", { name: "Your guilds" });
  expect(within(yours).getByText("Joined")).toBeTruthy();
  expect(within(yours).getByText("Founded by you")).toBeTruthy();
  expect(within(yours).queryByText("other")).toBeNull();
  expect(within(screen.getByRole("region", { name: "Explore guilds" })).getByText("other")).toBeTruthy();
});
