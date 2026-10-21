// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

const read = vi.hoisted(() => ({ pet: vi.fn(), guild: vi.fn() }));
const draw = vi.hoisted(() => ({ pet: vi.fn(async () => new Response("pet")), guild: vi.fn(async () => new Response("guild")) }));
vi.mock("@/server/solana", () => ({ readPet: read.pet, readGuild: read.guild }));
vi.mock("@/server/card", () => ({ petCard: draw.pet, guildCard: draw.guild }));
import { GET } from "./route";

const PET = "So11111111111111111111111111111111111111112";
const icon = (query: string) => GET(new Request(`http://localhost/api/actions/icon${query}`));
afterEach(() => vi.clearAllMocks());

it("draws only a pet or guild that is there; any other query goes to the plain card", async () => {
  read.pet.mockImplementation(async (id: string) => (id === PET ? { pet: { address: PET } } : null));
  read.guild.mockImplementation(async (slug: string) => (slug === "sunbeam-club" ? { slug } : null));

  for (const [query, to] of [
    ["?pet=made-up", ""],
    ["?guild=nobody-here", ""],
    ["?guild=Not%20A%20Slug", ""],
    [`?pet=${PET}&v=1`, `?pet=${PET}`],
    [`?guild=sunbeam-club&pet=${PET}`, "?guild=sunbeam-club"],
  ]) {
    const response = await icon(query);
    expect(response.status, query).toBe(307);
    expect(response.headers.get("location"), query).toBe(`http://localhost/api/actions/icon${to}`);
  }
  expect(draw.pet).not.toHaveBeenCalled();
  expect(draw.guild).not.toHaveBeenCalled();

  read.pet.mockRejectedValueOnce(new Error("429"));
  expect((await icon(`?pet=${PET}`)).headers.get("location")).toBe("http://localhost/api/actions/icon");

  for (const query of ["", `?pet=${PET}`, "?guild=sunbeam-club"]) expect((await icon(query)).status, query).toBe(200);
  expect(draw.pet).toHaveBeenCalledTimes(2);
  expect(draw.guild).toHaveBeenCalledTimes(1);
});
