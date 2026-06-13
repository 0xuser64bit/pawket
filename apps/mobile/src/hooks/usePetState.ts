import { useMemo, useState } from 'react';
import { applyCareAction, calculateMood, CareActionType } from '@pawket/shared';
import { demoPet } from '../dev/demoPet';
export function usePetState() {
  const [pet, setPet] = useState(demoPet);
  const mood = useMemo(() => calculateMood(pet), [pet]);
  return {
    pet,
    mood,
    care: (action: CareActionType) => setPet((p) => ({ ...p, ...applyCareAction(p, action) })),
  };
}
