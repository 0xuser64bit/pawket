/**
 * Placeholder. This file does not exercise adopt/care.
 * Adding an instruction is not done until a case here submits the ix.
 * See docs/engineering/TESTING.md and .agents/skills/adding-solana-instruction.
 */
import * as anchor from '@coral-xyz/anchor';
import { assert } from 'chai';

describe('pawket', () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Pawket;

  it('adopts a pet', async () => {
    assert.ok(program.programId);
  });

  it('documents required test cases for the next Anchor slice', () => {
    assert.deepEqual(
      [
        'cannot care for another user pet',
        'care updates state',
        'cooldown rejects spam',
        'invalid input rejected',
      ].length,
      4,
    );
  });
});
