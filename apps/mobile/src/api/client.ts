import { PawketApiClient } from '@pawket/sdk';
export const api = new PawketApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787');
