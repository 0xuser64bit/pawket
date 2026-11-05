import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getAddressDecoder, getAddressEncoder, getBase64Decoder, type Address } from "@solana/kit";
import type { ChainPoll } from "@/lib/solana/accounts";
import { deriveBallotPda } from "@/lib/solana/pda";
import { PAWKET_ACCOUNTS, PAWKET_PROGRAM_ID } from "@/lib/solana/program";
import { GuildGatherings } from "./gatherings";

const state = vi.hoisted(() => ({ owned: [] as unknown[], owner: "11111111111111111111111111111111", rpc: { getMultipleAccounts: vi.fn(), getProgramAccounts: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/companion/use-companion", () => ({ useCompanion: () => ({ ready: true, owner: state.owner, canSign: true, owned: state.owned }) }));
vi.mock("@/lib/solana/browser-client", () => ({ rpc: state.rpc }));
vi.mock("@/lib/solana/use-send", () => ({
  usePawketSend: () => ({ busy: false, act: vi.fn() }),
  useSponsor: () => ({ data: { available: true } }),
  rentWaits: () => false,
}));

const key = (id: number): Address => {
  const bytes = new Uint8Array(32);
  new DataView(bytes.buffer).setUint32(0, id, true);
  return getAddressDecoder().decode(bytes);
};
const pet = key(1);
const event = key(2);
const guild = { address: key(3), name: "Cloud Nine", founderPet: key(4) };
const initial = Date.UTC(2026, 9, 30, 12) / 1000;
const picnic = { address: event, guild: guild.address, creator: state.owner as Address, id: 0, createdAt: initial, startsAt: initial + 3600, endsAt: initial + 7200, going: 1, came: 0, title: "Cloud picnic", note: "" };
const account = (bytes: Uint8Array) => ({ data: [getBase64Decoder().decode(bytes), "base64"], executable: false, lamports: 890_880n, owner: PAWKET_PROGRAM_ID, space: BigInt(bytes.length) });
let failBallots = false;
let failRsvps = false;
let ballotAccounts: Map<string, ReturnType<typeof account>>;

beforeEach(() => {
  state.owned = [{ pet: { address: pet, name: "Miso" }, member: { guild: guild.address } }];
  failBallots = false;
  failRsvps = false;
  ballotAccounts = new Map();
  const bytes = new Uint8Array(PAWKET_ACCOUNTS.rsvp.size);
  bytes.set(PAWKET_ACCOUNTS.rsvp.discriminator);
  bytes.set(getAddressEncoder().encode(event), 8);
  bytes.set(getAddressEncoder().encode(pet), 40);
  state.rpc.getProgramAccounts.mockImplementation(() => ({ send: async () => {
    if (failRsvps) throw new Error("RSVP provider unavailable");
    return [{ pubkey: key(5), account: account(bytes) }];
  } }));
  state.rpc.getMultipleAccounts.mockImplementation((keys: Address[]) => ({ send: async () => {
    if (keys.length > 100) throw new Error("RPC proxy permits at most 100 accounts");
    if (failBallots) throw new Error("Ballot provider unavailable");
    return { context: { slot: 1n }, value: keys.map((address) => ballotAccounts.get(address) ?? null) };
  } }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function polls(count: number) {
  const found: ChainPoll[] = Array.from({ length: count }, (_, id) => ({ address: key(id + 10), guild: guild.address, creator: state.owner as Address, id, createdAt: initial - id, closesAt: Date.now() / 1000 + 86400, votes: [1, 0], question: `Question ${id}`, options: ["Garden", "Beach"] }));
  await Promise.all(found.filter((_, id) => id % 2 === 0).map(async (poll) => {
    const bytes = new Uint8Array(PAWKET_ACCOUNTS.ballot.size);
    bytes.set(PAWKET_ACCOUNTS.ballot.discriminator);
    bytes[136] = 1;
    ballotAccounts.set((await deriveBallotPda(poll.address, state.owner)).address, account(bytes));
  }));
  return found;
}

it.each([100, 101, 201])("reads %i historical ballot addresses through the actual request and preserves each vote", async (count) => {
  const found = await polls(count);
  render(<GuildGatherings guild={guild} events={[{ ...picnic, startsAt: Date.now() / 1000 + 3600, endsAt: Date.now() / 1000 + 7200 }]} polls={found} />);
  await waitFor(() => expect(screen.getByText("Miso is going")).toBeVisible());
  await waitFor(() => expect(screen.getAllByText(/your vote/)).toHaveLength(Math.ceil(count / 2)));
  for (const id of [0, 1, count - 1]) {
    const card = screen.getByRole("heading", { name: `Question ${id}` }).closest("article")!;
    if (id % 2 === 0) {
      expect(within(card).getByText(/Beach/)).toHaveTextContent("your vote");
      expect(within(card).queryByRole("button", { name: /Vote/ })).toBeNull();
    } else expect(within(card).getByRole("button", { name: "Vote Garden, 1 so far" })).toBeEnabled();
  }
});

it.each(["ballots", "RSVPs"])("shows a retry and withholds actions after a failed %s read", async (failed) => {
  const found = await polls(1);
  failBallots = failed === "ballots";
  failRsvps = failed === "RSVPs";
  render(<GuildGatherings guild={guild} events={[{ ...picnic, startsAt: Date.now() / 1000 + 3600, endsAt: Date.now() / 1000 + 7200 }]} polls={found} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Ask again" })).toBeVisible());
  expect(screen.getByRole("alert")).toHaveTextContent(/RSVPs and votes/);
  expect(screen.queryByRole("button", { name: /Going with|Check in|Vote / })).toBeNull();
  failBallots = false;
  failRsvps = false;
  fireEvent.click(screen.getByRole("button", { name: "Ask again" }));
  await waitFor(() => expect(screen.getByText("Miso is going")).toBeVisible());
  expect(screen.getByText(/your vote/)).toBeVisible();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("withholds actions while the initial personal record read is still pending", async () => {
  let finish!: () => void;
  state.rpc.getProgramAccounts.mockReturnValue({ send: () => new Promise<[]>(resolve => { finish = () => resolve([]); }) });
  render(<GuildGatherings guild={guild} events={[]} polls={await polls(1)} />);
  expect(screen.queryByRole("button", { name: /Vote / })).toBeNull();
  await act(async () => { finish(); });
});
