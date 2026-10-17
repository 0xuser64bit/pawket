// @vitest-environment node
import { expect, it } from "vitest";
import type { PetOnChain } from "@/lib/solana/accounts";
import { returnsOf } from "./pulse";

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
