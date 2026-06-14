import type { PetSpecies } from '@pawket/shared';
import { PetChamber } from './PetChamber';

/**
 * Backwards-compatible alias. The pet visual system now lives in PetChamber +
 * PetCreature (SVG). Prefer importing PetChamber directly in new code.
 */
export function PetAvatar({
  mood,
  species,
  compact = false,
}: {
  mood?: string;
  species?: PetSpecies;
  compact?: boolean;
}) {
  return <PetChamber mood={mood ?? 'Radiant'} species={species} compact={compact} />;
}
