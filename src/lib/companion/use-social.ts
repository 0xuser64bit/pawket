"use client";

import { useCallback } from "react";
import { useRequest } from "@solana/react";
import { fetchEncodedAccounts, type Address } from "@solana/kit";
import { decodeGuestbook, fetchPetRsvps } from "@/lib/solana/accounts";
import { rpc } from "@/lib/solana/browser-client";
import { deriveGuestbookPda } from "@/lib/solana/pda";
import { PAWKET_PROGRAM_ID } from "@/lib/solana/program";

export interface SocialRecord {
  waves: number;
  gatherings: number;
}

export function useSocialRecords(pets: Address[]) {
  const key = pets.join(",");
  const read = useCallback(async () => {
    const list = key ? (key.split(",") as Address[]) : [];
    const books = await Promise.all(list.map(async (pet) => (await deriveGuestbookPda(pet)).address));
    const [accounts, rsvps] = await Promise.all([
      books.length ? fetchEncodedAccounts(rpc, books) : Promise.resolve([]),
      Promise.all(list.map((pet) => fetchPetRsvps(rpc, pet))),
    ]);
    const out = new Map<string, SocialRecord>();
    list.forEach((pet, i) => {
      const account = accounts[i];
      const waves = account?.exists && account.programAddress === PAWKET_PROGRAM_ID ? decodeGuestbook(books[i], account.data).waves : 0;
      out.set(pet, { waves, gatherings: rsvps[i].filter((rsvp) => rsvp.came).length });
    });
    return out;
  }, [key]);
  return useRequest(key ? read : null);
}
