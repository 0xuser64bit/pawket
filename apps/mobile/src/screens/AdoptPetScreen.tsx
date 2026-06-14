import { Ionicons } from '@expo/vector-icons';
import { PetPersonality, PetSpecies, type Pet } from '@pawket/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, GlassPanel, Pill, SectionHeader } from '../components/DesignSystem';
import { MessageBanner } from '../components/MessageBanner';
import { PetAvatar } from '../components/PetAvatar';
import { Screen } from '../components/Screen';
import { colors, radius, spacing, typography } from '../theme/tokens';

const speciesOptions: {
  value: Pet['species'];
  title: string;
  copy: string;
  tone: 'purple' | 'green' | 'cyan';
}[] = [
  {
    value: PetSpecies.LunaCat,
    title: 'Luna Cat',
    copy: 'Moonlit, precise, curious by default.',
    tone: 'purple',
  },
  {
    value: PetSpecies.MossPup,
    title: 'Moss Pup',
    copy: 'Loyal, kinetic, tuned for outdoor quests.',
    tone: 'green',
  },
  {
    value: PetSpecies.CloudBun,
    title: 'Cloud Bun',
    copy: 'Soft, fast, carries stormlight memories.',
    tone: 'cyan',
  },
];

const personalityOptions: {
  value: Pet['personality'];
  title: string;
  copy: string;
  icon: 'search-outline' | 'bonfire-outline' | 'shield-outline' | 'flash-outline';
}[] = [
  {
    value: PetPersonality.Curious,
    title: 'Curious',
    copy: 'Finds hidden memories.',
    icon: 'search-outline',
  },
  {
    value: PetPersonality.Cozy,
    title: 'Cozy',
    copy: 'Bonds through care streaks.',
    icon: 'bonfire-outline',
  },
  {
    value: PetPersonality.Brave,
    title: 'Brave',
    copy: 'Built for seasonal quests.',
    icon: 'shield-outline',
  },
  {
    value: PetPersonality.Mischief,
    title: 'Mischief',
    copy: 'Chaotic, playful, rare energy.',
    icon: 'flash-outline',
  },
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
      <Pill tone="purple">Adoption chamber</Pill>
      <Text style={styles.title}>Choose your first companion.</Text>
      <Text style={styles.copy}>
        This creates a dev/API-backed Pawket record and starts its Passport timeline. On-chain
        claims stay honest until signing is wired.
      </Text>

      <PetAvatar compact mood={label(personality)} species={species} />

      <GlassPanel style={styles.namingPanel}>
        <SectionHeader eyebrow="identity" title="Name signal" />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Companion name"
          placeholderTextColor={colors.faint}
          style={styles.input}
          maxLength={24}
        />
      </GlassPanel>

      <SectionHeader eyebrow="species" title="Pick a companion body" />
      <View style={styles.options}>
        {speciesOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setSpecies(option.value)}
            style={({ pressed }) => [
              styles.speciesCard,
              species === option.value && styles.selectedCard,
              pressed && styles.pressed,
            ]}
          >
            <Pill tone={option.tone}>{option.title}</Pill>
            <Text style={styles.optionCopy}>{option.copy}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader eyebrow="personality" title="Tune the first spark" />
      <View style={styles.personalityGrid}>
        {personalityOptions.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setPersonality(option.value)}
            style={({ pressed }) => [
              styles.personalityCard,
              personality === option.value && styles.selectedCard,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={personality === option.value ? colors.solanaGreen : colors.muted}
              name={option.icon}
              size={22}
            />
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionCopy}>{option.copy}</Text>
          </Pressable>
        ))}
      </View>

      <MessageBanner tone="error" message={error} />
      <Button
        icon="sparkles-outline"
        label={loading ? 'Opening chamber…' : `Adopt ${name.trim() || 'companion'}`}
        onPress={() => onAdopted({ name: name.trim(), species, personality })}
        disabled={loading || name.trim().length < 2}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textSoft },
  namingPanel: { gap: spacing.md },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    padding: spacing.md,
  },
  options: { gap: spacing.sm },
  speciesCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  personalityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  personalityCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minWidth: '45%',
    padding: spacing.md,
  },
  selectedCard: { backgroundColor: 'rgba(20,241,149,0.09)', borderColor: 'rgba(20,241,149,0.55)' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  optionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  optionCopy: { color: colors.muted, lineHeight: 20 },
});
