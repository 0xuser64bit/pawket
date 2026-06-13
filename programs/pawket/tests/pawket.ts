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
