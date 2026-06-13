import { PublicKey, SystemProgram } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';
import { CareActionType, PetPersonality, PetSpecies } from '@pawket/shared';
import {
  buildAdoptPetTransaction,
  buildCareTransaction,
  buildInitializeGameConfigTransaction,
  deriveGameConfigPda,
  deriveItemPda,
  deriveOwnershipPda,
  derivePassportPda,
  derivePetPda,
  encodeCareActionVariant,
  encodePetPersonalityVariant,
  encodePetSpeciesVariant,
  PAWKET_INSTRUCTION_DISCRIMINATORS,
  PAWKET_PROGRAM_ID,
  PawketSolanaValidationError,
} from './solanaClient';

const owner = new PublicKey('So11111111111111111111111111111111111111112');
const treasury = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const feePayer = new PublicKey('SysvarRent111111111111111111111111111111111');
const recentBlockhash = '11111111111111111111111111111111';

function bytes(value: Uint8Array, start?: number, end?: number) {
  return Array.from(value.slice(start, end));
}

describe('Pawket Solana PDA helpers', () => {
  it('derives stable program addresses from the checked-in Pawket program id', () => {
    const gameConfig = deriveGameConfigPda();
    const pet = derivePetPda(owner, 'Nova');
    const passport = derivePassportPda(pet.publicKey);
    const item = deriveItemPda('starter_bowl');
    const ownership = deriveOwnershipPda(owner, item.publicKey);

    expect(PAWKET_PROGRAM_ID).toBe('FQwe9LUPMTrhYyr32mHPpX87tcpjr98Eamz9wJQDaSef');
    expect(gameConfig).toEqual({
      publicKey: new PublicKey('oRoeJ7buLDW1vbCtavT6YkZK61PdMH2YZEsYC4vW1W9'),
      bump: 255,
    });
    expect(pet).toEqual({
      publicKey: new PublicKey('8BmhnFXLwH5CybvAb9hZWdtRkQ1CdW9UxqNzQbJdG75G'),
      bump: 255,
    });
    expect(passport).toEqual({
      publicKey: new PublicKey('GSwQU7shQJB6EU1FdnMxMWwPBnxb5XpoHZdKmzLQNqDT'),
      bump: 255,
    });
    expect(item).toEqual({
      publicKey: new PublicKey('8vcZhhCqeUzPphQZ17N4uMqaQxCt2mgHdfiJrr9vMVVH'),
      bump: 255,
    });
    expect(ownership).toEqual({
      publicKey: new PublicKey('48oGBcsu5bxWLjuHVpqxpdWaHu1e2MaNTnrYEoo8wCMb'),
      bump: 253,
    });
  });
});

describe('Pawket Solana enum encoders', () => {
  it('matches Anchor/Borsh enum variant indexes', () => {
    expect(encodePetSpeciesVariant(PetSpecies.LunaCat)).toBe(0);
    expect(encodePetSpeciesVariant(PetSpecies.MossPup)).toBe(1);
    expect(encodePetSpeciesVariant(PetSpecies.CloudBun)).toBe(2);
    expect(encodePetPersonalityVariant(PetPersonality.Curious)).toBe(0);
    expect(encodePetPersonalityVariant(PetPersonality.Cozy)).toBe(1);
    expect(encodePetPersonalityVariant(PetPersonality.Brave)).toBe(2);
    expect(encodePetPersonalityVariant(PetPersonality.Mischief)).toBe(3);
    expect(encodeCareActionVariant(CareActionType.Feed)).toBe(0);
    expect(encodeCareActionVariant(CareActionType.Play)).toBe(1);
    expect(encodeCareActionVariant(CareActionType.Groom)).toBe(2);
    expect(encodeCareActionVariant(CareActionType.Rest)).toBe(3);
  });
});

describe('Pawket Solana transaction builders', () => {
  it('builds an Anchor-compatible adopt_pet instruction', () => {
    const transaction = buildAdoptPetTransaction({
      owner,
      name: 'Nova',
      species: PetSpecies.MossPup,
      personality: PetPersonality.Mischief,
      recentBlockhash,
      feePayer,
    });
    const [instruction] = transaction.instructions;
    if (!instruction) throw new Error('Expected adopt instruction.');
    const pet = derivePetPda(owner, 'Nova').publicKey;
    const passport = derivePassportPda(pet).publicKey;

    expect(transaction.recentBlockhash).toBe(recentBlockhash);
    expect(transaction.feePayer?.toBase58()).toBe(feePayer.toBase58());
    expect(instruction.programId.toBase58()).toBe(PAWKET_PROGRAM_ID);
    expect(instruction.keys).toEqual([
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: pet, isSigner: false, isWritable: true },
      { pubkey: passport, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    expect(bytes(instruction.data, 0, 8)).toEqual(PAWKET_INSTRUCTION_DISCRIMINATORS.adoptPet);
    expect(bytes(instruction.data, 8, 12)).toEqual([4, 0, 0, 0]);
    expect(new TextDecoder().decode(instruction.data.slice(12, 16))).toBe('Nova');
    expect(bytes(instruction.data, 16, 18)).toEqual([1, 3]);
    expect(transaction.serializeMessage().length).toBeGreaterThan(0);
  });

  it('builds an Anchor-compatible perform_care_action instruction', () => {
    const transaction = buildCareTransaction({
      owner: owner.toBase58(),
      petName: 'Nova',
      action: CareActionType.Groom,
      recentBlockhash,
    });
    const [instruction] = transaction.instructions;
    if (!instruction) throw new Error('Expected care instruction.');
    const pet = derivePetPda(owner, 'Nova').publicKey;
    const passport = derivePassportPda(pet).publicKey;

    expect(transaction.feePayer?.toBase58()).toBe(owner.toBase58());
    expect(transaction.recentBlockhash).toBe(recentBlockhash);
    expect(instruction.programId.toBase58()).toBe(PAWKET_PROGRAM_ID);
    expect(instruction.keys).toEqual([
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pet, isSigner: false, isWritable: true },
      { pubkey: passport, isSigner: false, isWritable: true },
    ]);
    expect(bytes(instruction.data, 0, 8)).toEqual(
      PAWKET_INSTRUCTION_DISCRIMINATORS.performCareAction,
    );
    expect(bytes(instruction.data, 8, 9)).toEqual([2]);
  });

  it('builds an Anchor-compatible initialize_game_config instruction', () => {
    const transaction = buildInitializeGameConfigTransaction({
      authority: owner,
      treasury,
      recentBlockhash,
    });
    const [instruction] = transaction.instructions;
    if (!instruction) throw new Error('Expected initialize instruction.');

    expect(transaction.feePayer?.toBase58()).toBe(owner.toBase58());
    expect(instruction.programId.toBase58()).toBe(PAWKET_PROGRAM_ID);
    expect(instruction.keys).toEqual([
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: deriveGameConfigPda().publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
    expect(bytes(instruction.data, 0, 8)).toEqual(
      PAWKET_INSTRUCTION_DISCRIMINATORS.initializeGameConfig,
    );
    expect(bytes(instruction.data, 8)).toEqual(bytes(treasury.toBytes()));
  });

  it('throws validation errors for invalid builder inputs', () => {
    expect(() =>
      buildAdoptPetTransaction({
        owner,
        name: 'N',
        species: PetSpecies.LunaCat,
        personality: PetPersonality.Curious,
      }),
    ).toThrow(PawketSolanaValidationError);
    expect(() =>
      buildCareTransaction({
        owner: 'not-a-public-key',
        petName: 'Nova',
        action: CareActionType.Feed,
      }),
    ).toThrow(PawketSolanaValidationError);
    expect(() =>
      buildCareTransaction({
        owner,
        petName: 'Nova',
        action: 'nap' as CareActionType,
      }),
    ).toThrow(PawketSolanaValidationError);
  });
});
