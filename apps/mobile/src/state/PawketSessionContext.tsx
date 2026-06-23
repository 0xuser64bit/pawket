import {
  PawketApiError,
  type CareActionType,
  type DailyGoalsResponse,
  type Pet,
  type PetPassportEvent,
} from '@pawket/sdk';
import { router } from 'expo-router';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../api/client';
import { hasCompanionKey } from '../wallet/companionKey';
import { DeviceWalletAdapter, type WalletSession } from '../wallet/walletAdapter';

type SessionStatus =
  | 'idle'
  | 'connecting'
  | 'loading_pet'
  | 'loading_daily_goals'
  | 'adopting'
  | 'caring'
  | 'claiming_daily_reward'
  | 'loading_passport';

type CareFeedback = {
  actionType: CareActionType | 'daily_reward';
  title: string;
  copy: string;
  xpGained: number;
  levelDelta: number;
  statDeltas: Partial<Record<keyof Pet['stats'], number>>;
  passportEventTitle?: string;
};

type PawketSession = {
  wallet: WalletSession | null;
  pet: Pet | null;
  dailyGoals: DailyGoalsResponse | null;
  passportEvents: PetPassportEvent[];
  status: SessionStatus;
  /** False until the first launch-time session restore completes. */
  hydrated: boolean;
  error: string | null;
  notice: string | null;
  careFeedback: CareFeedback | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  startOver: () => Promise<void>;
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
  dismissCareFeedback: () => void;
};

const PawketSessionContext = createContext<PawketSession | null>(null);

function messageFromError(error: unknown) {
  if (error instanceof PawketApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

function statDeltas(before: Pet['stats'], after: Pet['stats']): CareFeedback['statDeltas'] {
  return {
    hunger: after.hunger - before.hunger,
    happiness: after.happiness - before.happiness,
    energy: after.energy - before.energy,
    hygiene: after.hygiene - before.hygiene,
  };
}

function careActionLabel(actionType: CareActionType | 'daily_reward') {
  if (actionType === 'daily_reward') return 'Daily reward';
  return actionType.charAt(0).toUpperCase() + actionType.slice(1);
}

export function PawketSessionProvider({ children }: { children: ReactNode }) {
  const adapterRef = useRef(new DeviceWalletAdapter());
  const [wallet, setWallet] = useState<WalletSession | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [dailyGoals, setDailyGoals] = useState<DailyGoalsResponse | null>(null);
  const [passportEvents, setPassportEvents] = useState<PetPassportEvent[]>([]);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [careFeedback, setCareFeedback] = useState<CareFeedback | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const dismissCareFeedback = useCallback(() => {
    setCareFeedback(null);
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

  const openSession = useCallback(
    async (session: WalletSession) => {
      setWallet(session);
      setStatus('loading_pet');
      const activePet = await refreshPetForWallet(session);
      if (activePet) {
        setStatus('loading_daily_goals');
        await refreshDailyGoalsForPet(activePet, session);
      }
      setStatus('idle');
      return activePet;
    },
    [refreshDailyGoalsForPet, refreshPetForWallet],
  );

  const connect = useCallback(async () => {
    clearMessages();
    setStatus('connecting');
    try {
      const session = await adapterRef.current.connect();
      const activePet = await openSession(session);
      router.replace(activePet ? '/home' : '/adopt');
    } catch (caught) {
      setStatus('idle');
      setError(messageFromError(caught));
    }
  }, [clearMessages, openSession]);

  const disconnect = useCallback(async () => {
    await adapterRef.current.disconnect();
    setWallet(null);
    setPet(null);
    setDailyGoals(null);
    setPassportEvents([]);
    setCareFeedback(null);
    clearMessages();
    setStatus('idle');
    router.replace('/');
  }, [clearMessages]);

  const startOver = useCallback(async () => {
    await adapterRef.current.reset();
    setWallet(null);
    setPet(null);
    setDailyGoals(null);
    setPassportEvents([]);
    setCareFeedback(null);
    clearMessages();
    setStatus('idle');
    router.replace('/');
  }, [clearMessages]);

  // Silently resume a returning player's session on launch so the same device
  // lands back on its own pet without re-tapping "connect".
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (await hasCompanionKey()) {
          const session = await adapterRef.current.connect();
          if (!active) return;
          const activePet = await openSession(session);
          if (active) router.replace(activePet ? '/home' : '/adopt');
        }
      } catch {
        // First launch or restore failure → fall back to the landing flow.
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [openSession]);

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
        const previousPet = pet;
        const response = await api.careForPet({
          petId: pet.id,
          walletAddress: wallet.address,
          actionType,
        });
        setPet(response.pet);
        prependPassportEvent(response.passportEvent);
        await refreshDailyGoalsForPet(response.pet, wallet);
        const xpGained = Math.max(0, response.pet.xp - previousPet.xp);
        const levelDelta = Math.max(0, response.pet.level - previousPet.level);
        setCareFeedback({
          actionType,
          title: levelDelta > 0 ? 'Bond level increased' : 'Memory unlocked',
          copy:
            response.passportEvent?.description ??
            `${careActionLabel(actionType)} was recorded in ${response.pet.name}'s passport timeline.`,
          xpGained,
          levelDelta,
          statDeltas: statDeltas(previousPet.stats, response.pet.stats),
          passportEventTitle: response.passportEvent?.title,
        });
        setNotice(`${response.pet.name} gained ${xpGained} XP.`);
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
      setCareFeedback({
        actionType: 'daily_reward',
        title: 'Season streak sealed',
        copy:
          response.passportEvent.description ??
          'The daily ritual reward was added to the passport timeline.',
        xpGained: response.dailyGoals.reward?.xp ?? Math.max(0, response.pet.xp - pet.xp),
        levelDelta: Math.max(0, response.pet.level - pet.level),
        statDeltas: {},
        passportEventTitle: response.passportEvent.title,
      });
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
      hydrated,
      error,
      notice,
      careFeedback,
      connect,
      disconnect,
      startOver,
      refreshPet,
      adoptPet,
      careForPet,
      refreshDailyGoals,
      claimDailyReward,
      loadPassport,
      clearMessages,
      dismissCareFeedback,
    }),
    [
      wallet,
      pet,
      dailyGoals,
      passportEvents,
      status,
      hydrated,
      error,
      notice,
      careFeedback,
      connect,
      disconnect,
      startOver,
      refreshPet,
      adoptPet,
      careForPet,
      refreshDailyGoals,
      claimDailyReward,
      loadPassport,
      clearMessages,
      dismissCareFeedback,
    ],
  );

  return <PawketSessionContext.Provider value={value}>{children}</PawketSessionContext.Provider>;
}

export function usePawketSession() {
  const context = useContext(PawketSessionContext);
  if (!context) throw new Error('usePawketSession must be used inside PawketSessionProvider');
  return context;
}
