import { AccountRole, generateKeyPairSigner } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { getCreateCollectionInstruction, getCreateKeepsakeInstruction, MPL_CORE_PROGRAM_ID, PAWKET_COLLECTION } from "./core";

// Borsh string: u32 LE length, then UTF-8.
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
      20, // CreateV2
      0, // DataState::AccountState
      ...str("Pepper"),
      ...str("https://pawket.test/api/keepsake/x"),
      1, 2, 0, 0, 0, // Some(two plugins)
      5, 1, 1, 2, // PermanentFreezeDelegate { frozen: true }, Some(UpdateAuthority)
      6, 3, 0, 0, 0, ...str("pet"), ...str(PET), ...str("species"), ...str("Luna cat"), ...str("personality"), ...str("Curious"), 1, 2, // Attributes
      0, // no external plugin adapters
    ]);
    expect(ix.accounts!.map(({ address, role }) => [address, role])).toEqual([
      [asset.address, AccountRole.WRITABLE_SIGNER],
      [PAWKET_COLLECTION, AccountRole.WRITABLE],
      [sponsor.address, AccountRole.READONLY_SIGNER],
      [sponsor.address, AccountRole.WRITABLE_SIGNER],
      // The owner signs: a card lands only in a wallet that asked for it.
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
