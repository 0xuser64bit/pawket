import { PaymentHelpers } from '@pawket/sdk';
export const paymentClient = new PaymentHelpers(
  process.env.EXPO_PUBLIC_JUPITER_API_BASE_URL ?? 'https://quote-api.jup.ag/v6',
);
