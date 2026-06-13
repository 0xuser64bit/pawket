import type { PetSpecies } from '@pawket/shared';
import { StyleSheet, Text, View } from 'react-native';

function faceForSpecies(species?: PetSpecies) {
  if (species === 'moss_pup') return '◖•ᴥ•◗';
  if (species === 'cloud_bun') return '૮꒰˶ᵔ ᵕ ᵔ˶꒱ა';
  return 'ᓚᘏᗢ';
}

export function PetAvatar({ mood = 'Radiant', species }: { mood?: string; species?: PetSpecies }) {
  return (
    <View style={styles.orb}>
      <Text style={styles.face}>{faceForSpecies(species)}</Text>
      <Text style={styles.mood}>{mood}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  orb: {
    minHeight: 190,
    borderRadius: 40,
    backgroundColor: '#211b35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#463a70',
    padding: 20,
  },
  face: { fontSize: 62 },
  mood: { color: '#ffd166', fontWeight: '800', marginTop: 10, textTransform: 'uppercase' },
});
