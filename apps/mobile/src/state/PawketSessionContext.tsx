import {
  PawketApiError,
  type CareActionType,
  type DailyGoalsResponse,
  type Pet,
  type PetPassportEvent,
} from '@pawket/sdk';
import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../api/client';
import { DevWalletAdapter, type WalletSession } from '../wallet/walletAdapter';

type SessionStatus =
  | 'idle'
  | 'connecting'
  | 'loading_pet'
  | 'loading_daily_goals'
  | 'adopting'
  | 'caring'
  | 'claiming_daily_reward'
  | 'loading_passport';

type PawketSession = {
  wallet: WalletSession | null;
  pet: Pet | null;
  dailyGoals: DailyGoalsResponse | null;
  passportEvents: PetPassportEvent[];
  status: SessionStatus;
  error: string | null;
  notice: string | null;
  connectDevWallet: () => Promise<void>;
  refreshPet: () => Promise<void>;
  adoptPet: (input: {
    name: string;
    species: Pet['species'];
    personality: Pet['personality'];
  }) => Promise<void>;
  careForPet: (actionType: CareActionType) => Promise<void>;
  refreshDailyGoals: () => Promise<void>;
  claimDailyReward: () => Promise<void>;
  loadPassport: () => Promise<void>;
  clearMessages: () => void;
};

const PawketSessionContext = createContext<PawketSession | null>(null);

function messageFromError(error: unknown) {
  if (error instanceof PawketApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export function PawketSessionProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletSession | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [dailyGoals, setDailyGoals] = useState<DailyGoalsResponse | null>(null);
  const [passportEvents, setPassportEvents] = useState<PetPassportEvent[]>([]);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const refreshPetForWallet = useCallback(async (session: WalletSession) => {
    const response = await api.getPetByWallet(session.address);
    setPet(response.pet);
    if (!response.pet) setDailyGoals(null);
    return response.pet;
  }, []);

  const refreshDailyGoalsForPet = useCallback(async (activePet: Pet, session: WalletSession) => {
    const response = await api.getDailyGoals({
      petId: activePet.id,
      walletAddress: session.address,
    });
    setDailyGoals(response);
    return response;
  }, []);

  const prependPassportEvent = useCallback((event: PetPassportEvent | undefined) => {
    if (!event) return;
    setPassportEvents((events) => [
      event,
      ...events.filter((existing) => existing.id !== event.id),
    ]);
  }, []);

  const connectDevWallet = useCallback(async () => {
    clearMessages();
    setStatus('connecting');
    try {
      const session = await new DevWalletAdapter().connect();
      setWallet(session);
      setStatus('loading_pet');
      const activePet = await refreshPetForWallet(session);
      if (activePet) {
        setStatus('loading_daily_goals');
        await refreshDailyGoalsForPet(activePet, session);
      }
      setStatus('idle');
      router.replace(activePet ? '/home' : '/adopt');
    } catch (caught) {
      setStatus('idle');
      setError(messageFromError(caught));
    }
  }, [clearMessages, refreshDailyGoalsForPet, refreshPetForWallet]);

  const refreshPet = useCallback(async () => {
    if (!wallet) return;
    clearMessages();
    setStatus('loading_pet');
    try {
      const activePet = await refreshPetForWallet(wallet);
      if (activePet) {
        setStatus('loading_daily_goals');
        await refreshDailyGoalsForPet(activePet, wallet);
      }
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setStatus('idle');
    }
  }, [clearMessages, refreshDailyGoalsForPet, refreshPetForWallet, wallet]);

  const adoptPet = useCallback(
    async (input: { name: string; species: Pet['species']; personality: Pet['personality'] }) => {
      if (!wallet) {
        router.replace('/wallet');
        return;
      }
      clearMessages();
      setStatus('adopting');
      try {
        const response = await api.adoptPet({ walletAddress: wallet.address, ...input });
        setPet(response.pet);
        setPassportEvents([]);
        setStatus('loading_daily_goals');
        await refreshDailyGoalsForPet(response.pet, wallet);
        setNotice(`${response.pet.name} joined your Pawket.`);
        router.replace('/home');
      } catch (caught) {
        setError(messageFromError(caught));
      } finally {
        setStatus('idle');
      }
    },
    [clearMessages, refreshDailyGoalsForPet, wallet],
  );

  const careForPet = useCallback(
    async (actionType: CareActionType) => {
      if (!wallet) {
        router.replace('/wallet');
        return;
      }
      if (!pet) {
        router.replace('/adopt');
        return;
      }
      clearMessages();
      setStatus('caring');
      try {
        const response = await api.careForPet({
          petId: pet.id,
          walletAddress: wallet.address,
          actionType,
        });
        setPet(response.pet);
        prependPassportEvent(response.passportEvent);
        await refreshDailyGoalsForPet(response.pet, wallet);
        setNotice(`${response.pet.name} gained care XP.`);
      } catch (caught) {
        setError(messageFromError(caught));
      } finally {
        setStatus('idle');
      }
    },
    [clearMessages, pet, prependPassportEvent, refreshDailyGoalsForPet, wallet],
  );

  const refreshDailyGoals = useCallback(async () => {
    if (!wallet || !pet) return;
    clearMessages();
    setStatus('loading_daily_goals');
    try {
      await refreshDailyGoalsForPet(pet, wallet);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setStatus('idle');
    }
  }, [clearMessages, pet, refreshDailyGoalsForPet, wallet]);

  const claimDailyReward = useCallback(async () => {
    if (!wallet) {
      router.replace('/wallet');
      return;
    }
    if (!pet) {
      router.replace('/adopt');
      return;
    }
    clearMessages();
    setStatus('claiming_daily_reward');
    try {
      const response = await api.claimDailyReward({
        petId: pet.id,
        walletAddress: wallet.address,
      });
      setPet(response.pet);
      setDailyGoals(response.dailyGoals);
      prependPassportEvent(response.passportEvent);
      setNotice(`Claimed +${response.dailyGoals.reward?.xp ?? 25} XP daily reward.`);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setStatus('idle');
    }
  }, [clearMessages, pet, prependPassportEvent, wallet]);

  const loadPassport = useCallback(async () => {
    if (!pet) return;
    clearMessages();
    setStatus('loading_passport');
    try {
      const response = await api.getPetPassport(pet.id);
      setPassportEvents(response.events);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setStatus('idle');
    }
  }, [clearMessages, pet]);

  const value = useMemo(
    () => ({
      wallet,
      pet,
      dailyGoals,
      passportEvents,
      status,
      error,
      notice,
      connectDevWallet,
      refreshPet,
      adoptPet,
      careForPet,
      refreshDailyGoals,
      claimDailyReward,
      loadPassport,
      clearMessages,
    }),
    [
      wallet,
      pet,
      dailyGoals,
      passportEvents,
      status,
      error,
      notice,
      connectDevWallet,
      refreshPet,
      adoptPet,
      careForPet,
      refreshDailyGoals,
      claimDailyReward,
      loadPassport,
      clearMessages,
    ],
  );

  return <PawketSessionContext.Provider value={value}>{children}</PawketSessionContext.Provider>;
}

export function usePawketSession() {
  const context = useContext(PawketSessionContext);
  if (!context) throw new Error('usePawketSession must be used inside PawketSessionProvider');
  return context;
}
