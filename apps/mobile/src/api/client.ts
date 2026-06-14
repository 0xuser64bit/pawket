import { PawketApiClient } from '@pawket/sdk';
export const pawketApiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';
export const api = new PawketApiClient(pawketApiBaseUrl);
