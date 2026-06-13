import { Connection, PublicKey } from '@solana/web3.js';
import { NotConfiguredError } from './errors';

export type PawketProgramConfig = { rpcUrl: string; programId: string };
export class PawketProgramClient {
  readonly connection: Connection;
  readonly programId: PublicKey;
  constructor(config: PawketProgramConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.programId = new PublicKey(config.programId);
  }
  async getPetAddress(owner: PublicKey, petName: string) {
    const encoder = new TextEncoder();
    return PublicKey.findProgramAddressSync(
      [encoder.encode('pet'), owner.toBuffer(), encoder.encode(petName)],
      this.programId,
    )[0];
  }
  async adoptPetTransaction(): Promise<never> {
    throw new NotConfiguredError('Anchor IDL transaction builder');
  }
}
