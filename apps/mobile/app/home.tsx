import { router } from 'expo-router';
import { useEffect } from 'react';
import { PetHomeScreen } from '../src/screens/PetHomeScreen';
import { usePawketSession } from '../src/state/PawketSessionContext';

export default function HomeScreen() {
  const session = usePawketSession();

  useEffect(() => {
    if (!session.wallet) router.replace('/wallet');
    if (session.wallet && !session.pet) router.replace('/adopt');
  }, [session.pet, session.wallet]);

  return <PetHomeScreen />;
}
