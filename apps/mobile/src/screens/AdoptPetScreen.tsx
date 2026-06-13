import { PetPersonality, PetSpecies, type Pet } from '@pawket/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MessageBanner } from '../components/MessageBanner';
import { PetAvatar } from '../components/PetAvatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { colors } from '../theme/tokens';

const speciesOptions = [PetSpecies.LunaCat, PetSpecies.MossPup, PetSpecies.CloudBun];
const personalityOptions = [
  PetPersonality.Curious,
  PetPersonality.Cozy,
  PetPersonality.Brave,
  PetPersonality.Mischief,
];

function label(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function AdoptPetScreen({
  error,
  loading,
  onAdopted,
}: {
  error: string | null;
  loading: boolean;
  onAdopted: (input: {
    name: string;
    species: Pet['species'];
    personality: Pet['personality'];
  }) => void;
}) {
  const [name, setName] = useState('Nova');
  const [species, setSpecies] = useState<Pet['species']>(PetSpecies.LunaCat);
  const [personality, setPersonality] = useState<Pet['personality']>(PetPersonality.Curious);

  return (
    <Screen>
      <Text style={styles.kicker}>Adoption</Text>
      <Text style={styles.title}>Choose your first Pawket</Text>
      <PetAvatar mood={label(personality)} species={species} />
      <Text style={styles.copy}>
        Adoption is currently API/database-backed in dev mode. No on-chain success is claimed until
        Solana Mobile signing and Anchor transactions are wired.
      </Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Pet name"
        placeholderTextColor={colors.muted}
        style={styles.input}
        maxLength={24}
      />

      <Text style={styles.label}>Species</Text>
      <View style={styles.options}>
        {speciesOptions.map((option) => (
          <Pressable
            key={option}
            onPress={() => setSpecies(option)}
            style={[styles.option, species === option && styles.selected]}
          >
            <Text style={styles.optionText}>{label(option)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Personality</Text>
      <View style={styles.options}>
        {personalityOptions.map((option) => (
          <Pressable
            key={option}
            onPress={() => setPersonality(option)}
            style={[styles.option, personality === option && styles.selected]}
          >
            <Text style={styles.optionText}>{label(option)}</Text>
          </Pressable>
        ))}
      </View>

      <MessageBanner tone="error" message={error} />
      <PrimaryButton
        label={loading ? 'Adopting…' : `Adopt ${name || 'pet'}`}
        onPress={() => onAdopted({ name, species, personality })}
        disabled={loading || name.trim().length < 2}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  kicker: { color: colors.mint, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 38, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  label: { color: colors.text, fontWeight: '900', marginTop: 6 },
  input: {
    backgroundColor: colors.card,
    borderColor: '#2d2645',
    borderRadius: 18,
    borderWidth: 1,
    color: colors.text,
    fontSize: 18,
    padding: 16,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    backgroundColor: colors.card,
    borderColor: '#2d2645',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selected: { borderColor: colors.mint, backgroundColor: '#18342d' },
  optionText: { color: colors.text, fontWeight: '800' },
});
