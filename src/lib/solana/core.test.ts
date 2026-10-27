import { AccountRole, address, generateKeyPairSigner, getAddressEncoder } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { getCreateCollectionInstruction, getCreateKeepsakeInstruction, isKeepsakeOf, MPL_CORE_PROGRAM_ID, PAWKET_COLLECTION } from "./core";

const str = (value: string) => [value.length, 0, 0, 0, ...new TextEncoder().encode(value)];
const PET = "Cve24bjLvziU3b9T3tTFLjv9vXqFTeZEDTcMpXxcr8zC";

describe("keepsake instructions (Metaplex Core)", () => {
  it("creates a card frozen for good, with the pet among its attributes", async () => {
    const [asset, sponsor, owner] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner(), generateKeyPairSigner()]);
    const ix = getCreateKeepsakeInstruction({
      asset,
      collection: PAWKET_COLLECTION,
      authority: sponsor,
      payer: sponsor,
      owner,
      pet: PET,
      pawketWallet: PET,
      name: "Pepper",
      uri: "https://pawket.test/api/keepsake/x",
      species: "Luna cat",
      personality: "Curious",
    });

    expect([...ix.data!]).toEqual([
      20,
      0,
      ...str("Pepper"),
      ...str("https://pawket.test/api/keepsake/x"),
      1, 2, 0, 0, 0,
      5, 1, 1, 2,
      6, 3, 0, 0, 0, ...str("pet"), ...str(PET), ...str("species"), ...str("Luna cat"), ...str("personality"), ...str("Curious"), 1, 2,
      0,
    ]);
    expect(ix.accounts!.map(({ address, role }) => [address, role])).toEqual([
      [asset.address, AccountRole.WRITABLE_SIGNER],
      [PAWKET_COLLECTION, AccountRole.WRITABLE],
      [sponsor.address, AccountRole.READONLY_SIGNER],
      [sponsor.address, AccountRole.WRITABLE_SIGNER],
      [owner.address, AccountRole.READONLY_SIGNER],
      [MPL_CORE_PROGRAM_ID, AccountRole.READONLY],
      ["11111111111111111111111111111111", AccountRole.READONLY],
      [MPL_CORE_PROGRAM_ID, AccountRole.READONLY],
      [PET, AccountRole.READONLY],
    ]);
  });

  it("creates the collection with no plugins", async () => {
    const [collection, sponsor] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
    const ix = getCreateCollectionInstruction({ collection, updateAuthority: sponsor.address, payer: sponsor, name: "Pawket", uri: "u" });
    expect([...ix.data!]).toEqual([21, ...str("Pawket"), ...str("u"), 0, 0]);
    expect(ix.accounts!.map(({ role }) => role)).toEqual([
      AccountRole.WRITABLE_SIGNER,
      AccountRole.READONLY,
      AccountRole.WRITABLE_SIGNER,
      AccountRole.READONLY,
    ]);
  });
});

describe("isKeepsakeOf", () => {
  const OWNER = "3S6RvbyUvbCqyAEKNu3gGHDJoi7ZZB3JwQ7gFsDRhjEs";
  const bytes = (key: string) => [...getAddressEncoder().encode(address(key))];
  const asset = ({ kind = 1, owner = OWNER, authority = 2, collection = PAWKET_COLLECTION } = {}) =>
    Uint8Array.from([kind, ...bytes(owner), authority, ...bytes(collection), ...str("Pepper"), ...str("u"), 0]);

  it("is a card of Pawket's collection, held by the pet's owner", () => {
    expect(isKeepsakeOf(asset(), OWNER)).toBe(true);
  });

  it("is not another owner's asset, one outside the collection, or something else at the address", () => {
    expect(isKeepsakeOf(asset({ owner: PET }), OWNER)).toBe(false);
    expect(isKeepsakeOf(asset({ collection: PET }), OWNER)).toBe(false);
    expect(isKeepsakeOf(asset({ authority: 1 }), OWNER)).toBe(false);
    expect(isKeepsakeOf(asset({ kind: 5 }), OWNER)).toBe(false);
    expect(isKeepsakeOf(asset().subarray(0, 65), OWNER)).toBe(false);
  });
});
