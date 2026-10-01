import { AccountRole, address, getU32Encoder, type Address, type Instruction } from "@solana/kit";
import { concatBytes, encodeAnchorString, signerMeta, type SignerInput } from "./instructions";
import { parseAddress } from "./pda";

/**
 * Metaplex Core, for a pet's keepsake: one asset per pet on Solana, in
 * Pawket's collection, held by the pet's owner — a card in their wallet, not
 * the pet. The pet stays the program's `Pet` account; the card points at it.
 * It is frozen for good (PermanentFreezeDelegate, held by the collection), so
 * it cannot be sold or sent anywhere: there is no market, and no price.
 *
 * Bytes follow mpl-core's IDL: a u8 instruction index, then Borsh args.
 * Optional accounts that are absent take the program's own address, as
 * Metaplex's generated clients do.
 */
export const MPL_CORE_PROGRAM_ID = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

/** Pawket's collection on devnet, made once by `scripts/keepsake-collection.mts`; the sponsor is its update authority. */
export const PAWKET_COLLECTION = "5t7dqAEwdcG6C38XtHsMXbtwWyWZQFDqkjPy7JWPfEC9";

const CREATE_V2 = 20;
const CREATE_COLLECTION_V2 = 21;
const DATA_STATE_ACCOUNT = 0;
const PLUGIN_PERMANENT_FREEZE_DELEGATE = 5;
const PLUGIN_ATTRIBUTES = 6;
const AUTHORITY_UPDATE_AUTHORITY = 2;

const SYSTEM_PROGRAM = address("11111111111111111111111111111111");
const CORE = address(MPL_CORE_PROGRAM_ID);

const u32 = getU32Encoder();
const byte = (value: number) => Uint8Array.of(value);
const vec = (items: Uint8Array[]) => concatBytes(u32.encode(items.length), ...items);
const some = (value: Uint8Array) => concatBytes(byte(1), value);
const NONE = byte(0);
/** `Some(UpdateAuthority)`: the plugin answers to the collection's update authority. */
const BY_COLLECTION = some(byte(AUTHORITY_UPDATE_AUTHORITY));

export interface KeepsakeInput {
  /** The new asset; it signs its own creation. */
  asset: SignerInput;
  collection: string | Address;
  /** The collection's update authority, which signs each asset into it. */
  authority: SignerInput;
  payer: SignerInput;
  /** The pet's owner, who receives the card. A signer, so nothing lands in a wallet that did not ask. */
  owner: SignerInput;
  pet: string | Address;
  name: string;
  uri: string;
  species: string;
  personality: string;
}

/** `CreateV2`: the keepsake, frozen for good, with the pet's address among its attributes. */
export function getCreateKeepsakeInstruction(input: KeepsakeInput): Instruction {
  const attributes = [
    ["pet", parseAddress(input.pet, "pet")],
    ["species", input.species],
    ["personality", input.personality],
  ].map(([key, value]) => concatBytes(encodeAnchorString(key), encodeAnchorString(value)));

  return {
    programAddress: CORE,
    accounts: [
      signerMeta(input.asset, AccountRole.WRITABLE_SIGNER, "asset"),
      { address: parseAddress(input.collection, "collection"), role: AccountRole.WRITABLE },
      signerMeta(input.authority, AccountRole.READONLY_SIGNER, "authority"),
      signerMeta(input.payer, AccountRole.WRITABLE_SIGNER, "payer"),
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      { address: CORE, role: AccountRole.READONLY }, // updateAuthority: none, the collection holds it
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CORE, role: AccountRole.READONLY }, // logWrapper: none
    ],
    data: concatBytes(
      byte(CREATE_V2),
      byte(DATA_STATE_ACCOUNT),
      encodeAnchorString(input.name),
      encodeAnchorString(input.uri),
      some(
        vec([
          concatBytes(byte(PLUGIN_PERMANENT_FREEZE_DELEGATE), byte(1), BY_COLLECTION),
          concatBytes(byte(PLUGIN_ATTRIBUTES), vec(attributes), BY_COLLECTION),
        ]),
      ),
      NONE, // external plugin adapters
    ),
  };
}

/** `CreateCollectionV2`: Pawket's collection, made once per cluster. */
export function getCreateCollectionInstruction(input: {
  collection: SignerInput;
  updateAuthority: string | Address;
  payer: SignerInput;
  name: string;
  uri: string;
}): Instruction {
  return {
    programAddress: CORE,
    accounts: [
      signerMeta(input.collection, AccountRole.WRITABLE_SIGNER, "collection"),
      { address: parseAddress(input.updateAuthority, "update authority"), role: AccountRole.READONLY },
      signerMeta(input.payer, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: concatBytes(
      byte(CREATE_COLLECTION_V2),
      encodeAnchorString(input.name),
      encodeAnchorString(input.uri),
      NONE,
      NONE,
    ),
  };
}
