import { router } from 'expo-router';
import { useEffect } from 'react';
import { AdoptPetScreen } from '../src/screens/AdoptPetScreen';
import { usePawketSession } from '../src/state/PawketSessionContext';

export default function AdoptScreen() {
  const { adoptPet, error, pet, status, wallet } = usePawketSession();

  useEffect(() => {
    if (!wallet) router.replace('/wallet');
    if (wallet && pet) router.replace('/home');
  }, [pet, wallet]);

  return <AdoptPetScreen error={error} loading={status === 'adopting'} onAdopted={adoptPet} />;
}
