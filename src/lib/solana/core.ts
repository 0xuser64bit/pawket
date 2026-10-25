import { AccountRole, address, getU32Encoder, type Address, type Instruction } from "@solana/kit";
import { concatBytes, encodeAnchorString, signerMeta, type SignerInput } from "./instructions";
import { parseAddress } from "./pda";

export const MPL_CORE_PROGRAM_ID = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

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
const BY_COLLECTION = some(byte(AUTHORITY_UPDATE_AUTHORITY));

export interface KeepsakeInput {
  asset: SignerInput;
  collection: string | Address;
  authority: SignerInput;
  payer: SignerInput;
  owner: SignerInput;
  pet: string | Address;
  pawketWallet?: string | Address;
  name: string;
  uri: string;
  species: string;
  personality: string;
}

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
      { address: CORE, role: AccountRole.READONLY }, // updateAuthority: none (absent optional accounts take the program's address)
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: CORE, role: AccountRole.READONLY }, // logWrapper: none
      ...(input.pawketWallet ? [{ address: parseAddress(input.pawketWallet, "Pawket Wallet"), role: AccountRole.READONLY }] : []),
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
      NONE, // externalPluginAdapters
    ),
  };
}

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
