// @vitest-environment node
import { expect, it } from "vitest";
import type { PetOnChain } from "@/lib/solana/accounts";
import idl from "@/lib/solana/idl/pawket.json";
import { AT, returnsOf } from "./pulse";

const DAY = 86_400;
const pet = (bornDay: number, lastActiveDay: number) =>
  ({ pet: { birthTimestamp: bornDay * DAY + 3600 }, passport: { lastActiveDay } }) as unknown as PetOnChain;

it("counts a pet as back only on a later day than its adoption, among pets old enough to be", () => {
  const today = 1000;
  const pets = [
    pet(1000, 1000), // adopted today: too new to count
    pet(999, 999), // adopted yesterday, never back
    pet(999, 1000), // back the next day
    pet(990, 991), // back a day on, gone before the week
    pet(990, 998), // back a week on
  ];
  expect(returnsOf(pets, today)).toEqual({ day: { back: 3, of: 4 }, week: { back: 1, of: 2 } });
});

it("is zero of zero with no pets, never a division", () => {
  expect(returnsOf([], 1000)).toEqual({ day: { back: 0, of: 0 }, week: { back: 0, of: 0 } });
});

/** A field's offset in an account, from the IDL: the discriminator, then each fixed-size field before it. */
function offsetOf(account: string, field: string): number {
  const size = (type: unknown): number => {
    if (typeof type === "string") return { pubkey: 32, u8: 1, bool: 1, u16: 2, u32: 4, i64: 8, u64: 8 }[type] ?? NaN;
    const array = (type as { array?: [unknown, number] }).array;
    return array ? size(array[0]) * array[1] : NaN;
  };
  const fields = (idl.types.find((t) => t.name === account)!.type as { fields: Array<{ name: string; type: unknown }> }).fields;
  let at = 8;
  for (const each of fields) {
    if (each.name === field) return at;
    at += size(each.type);
  }
  throw new Error(`${account} has no ${field}`);
}

it("reads every count at the offset the IDL puts it", () => {
  expect(AT).toEqual({
    eventGoing: offsetOf("GuildEvent", "going"),
    eventCame: offsetOf("GuildEvent", "came"),
    pollVotes: offsetOf("GuildPoll", "votes"),
    closetCount: offsetOf("Closet", "count"),
    closetSpent: offsetOf("Closet", "spent"),
    guestbookWaves: offsetOf("Guestbook", "waves"),
    walletActions: offsetOf("PawketWallet", "actions"),
  });
});
