import {
  adoptPetSchema,
  careActionSchema,
  paymentIntentSchema,
  type AdoptPetInput,
  type CareActionInput,
  type PaymentIntentInput,
} from '@pawket/shared';

export class PawketApiClient {
  constructor(private readonly baseUrl: string) {}
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
    if (!response.ok) throw new Error(`Pawket API ${response.status}: ${await response.text()}`);
    return response.json() as Promise<T>;
  }
  getHealth() {
    return this.request<{ ok: true }>('/health');
  }
  getPets(walletAddress: string) {
    return this.request(`/pets/${walletAddress}`);
  }
  adoptPet(input: AdoptPetInput) {
    return this.request('/pets/adopt', {
      method: 'POST',
      body: JSON.stringify(adoptPetSchema.parse(input)),
    });
  }
  careForPet(petId: string, input: CareActionInput) {
    return this.request(`/pets/${petId}/care`, {
      method: 'POST',
      body: JSON.stringify(careActionSchema.parse(input)),
    });
  }
  createPaymentIntent(input: PaymentIntentInput) {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(paymentIntentSchema.parse(input)),
    });
  }
}
