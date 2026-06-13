import { z } from 'zod';
export const envSchema = z.object({
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().default(8787),
  API_VERSION: z.string().default('0.1.0'),
  DATABASE_URL: z.string().optional(),
  SOLANA_RPC_URL: z.string().default('https://api.devnet.solana.com'),
  SOLANA_CLUSTER: z.enum(['devnet', 'testnet', 'mainnet-beta', 'localnet']).default('devnet'),
  TREASURY_WALLET: z.string().default(''),
  JUPITER_API_BASE_URL: z.string().url().default('https://quote-api.jup.ag/v6'),
  MERCURYO_WIDGET_ID: z.string().optional(),
  MERCURYO_SECRET_KEY: z.string().optional(),
  MERCURYO_WEBHOOK_SECRET: z.string().optional(),
});
export const env = envSchema.parse(process.env);
