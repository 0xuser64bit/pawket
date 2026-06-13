import { router } from 'expo-router';
import { useEffect } from 'react';
import { LandingScreen } from '../src/screens/LandingScreen';
import { usePawketSession } from '../src/state/PawketSessionContext';

export default function Index() {
  const { wallet, pet } = usePawketSession();

  useEffect(() => {
    if (wallet && pet) router.replace('/home');
    if (wallet && !pet) router.replace('/adopt');
  }, [pet, wallet]);

  return <LandingScreen onStart={() => router.push(wallet ? '/adopt' : '/wallet')} />;
}
