import { PaymentStatus, type PaymentIntentInput } from '@pawket/shared';
export class PaymentService {
  async createIntent(input: PaymentIntentInput) {
    return {
      id: crypto.randomUUID(),
      ...input,
      status: PaymentStatus.Pending,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      note: 'Pending only. Confirmation requires verified on-chain settlement.',
    };
  }
}
