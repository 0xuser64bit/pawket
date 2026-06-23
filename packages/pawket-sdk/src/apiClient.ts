import {
  adoptPetRequestSchema,
  carePetRequestSchema,
  claimDailyRewardRequestSchema,
  dailyGoalsQuerySchema,
  paymentIntentSchema,
  walletAddressSchema,
  type AdoptPetInput,
  type AdoptPetResponse,
  type ApiErrorResponse,
  type CarePetInput,
  type CarePetResponse,
  type ClaimDailyRewardInput,
  type ClaimDailyRewardResponse,
  type DailyGoalsResponse,
  type PassportResponse,
  type PaymentIntentInput,
  type PetResponse,
} from '@pawket/shared';

export class PawketApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PawketApiError';
  }
}

export class PawketApiClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });

    if (!response.ok) {
      const text = await response.text();
      let parsed: ApiErrorResponse | null = null;
      try {
        parsed = JSON.parse(text) as ApiErrorResponse;
      } catch {
        parsed = null;
      }
      const error = parsed?.error;
      throw new PawketApiError(
        response.status,
        error?.code ?? 'API_ERROR',
        error?.message ?? `Pawket API ${response.status}`,
        error?.details,
      );
    }

    return response.json() as Promise<T>;
  }

  getHealth() {
    return this.request<{ ok: true; service: string }>('/health');
  }

  getPetByWallet(walletAddress: string): Promise<PetResponse> {
    const parsedWallet = walletAddressSchema.parse(walletAddress);
    return this.request(`/pets/${encodeURIComponent(parsedWallet)}`);
  }

  adoptPet(input: AdoptPetInput): Promise<AdoptPetResponse> {
    return this.request('/pets/adopt', {
      method: 'POST',
      body: JSON.stringify(adoptPetRequestSchema.parse(input)),
    });
  }

  careForPet(input: CarePetInput & { petId: string }): Promise<CarePetResponse> {
    return this.request(`/pets/${encodeURIComponent(input.petId)}/care`, {
      method: 'POST',
      body: JSON.stringify(
        carePetRequestSchema.parse({
          walletAddress: input.walletAddress,
          actionType: input.actionType,
        }),
      ),
    });
  }

  getPetPassport(petId: string): Promise<PassportResponse> {
    return this.request(`/pets/${encodeURIComponent(petId)}/passport`);
  }

  getDailyGoals(input: { petId: string; walletAddress: string }): Promise<DailyGoalsResponse> {
    const query = dailyGoalsQuerySchema.parse({ walletAddress: input.walletAddress });
    const search = new URLSearchParams({ walletAddress: query.walletAddress });
    return this.request(
      `/pets/${encodeURIComponent(input.petId)}/daily-goals?${search.toString()}`,
    );
  }

  claimDailyReward(
    input: ClaimDailyRewardInput & { petId: string },
  ): Promise<ClaimDailyRewardResponse> {
    return this.request(`/pets/${encodeURIComponent(input.petId)}/daily-goals/claim`, {
      method: 'POST',
      body: JSON.stringify(
        claimDailyRewardRequestSchema.parse({ walletAddress: input.walletAddress }),
      ),
    });
  }

  createPaymentIntent(input: PaymentIntentInput) {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(paymentIntentSchema.parse(input)),
    });
  }
}
