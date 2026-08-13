import { PetPersonality, PetSpecies, type Pet } from '@pawket/shared';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, SectionHeader } from '../components/DesignSystem';
import { FadeInUp, PressableScale } from '../components/Motion';
import { MessageBanner } from '../components/MessageBanner';
import { PetChamber } from '../components/PetChamber';
import { PetCreature } from '../components/PetCreature';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { selection, tapMedium } from '../feedback/haptics';
import { colors, fonts, radius, spacing } from '../theme/tokens';

const speciesOptions: { value: Pet['species']; title: string; copy: string }[] = [
  { value: PetSpecies.LunaCat, title: 'Luna Cat', copy: 'Quiet and precise' },
  { value: PetSpecies.MossPup, title: 'Moss Pup', copy: 'Loyal and restless' },
  { value: PetSpecies.CloudBun, title: 'Cloud Bun', copy: 'Soft and quick' },
];

const personalityOptions: {
  value: Pet['personality'];
  title: string;
  copy: string;
}[] = [
  { value: PetPersonality.Curious, title: 'Curious', copy: 'Finds hidden memories.' },
  { value: PetPersonality.Cozy, title: 'Cozy', copy: 'Bonds through streaks.' },
  { value: PetPersonality.Brave, title: 'Brave', copy: 'Ready for later quests.' },
  { value: PetPersonality.Mischief, title: 'Mischief', copy: 'Unpredictable energy.' },
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
  const trimmed = name.trim();
  const canAdopt = trimmed.length >= 2 && !loading;

  return (
    <Screen>
      <FadeInUp>
        <Text variant="title" tone="text">
          Who’s coming home?
        </Text>
        <Text variant="body" tone="muted" style={styles.lead}>
          Pick a body and a temperament. Adoption starts their passport.
        </Text>
      </FadeInUp>

      <FadeInUp delay={60}>
        <PetChamber species={species} mood={label(personality)} compact />
      </FadeInUp>

      <FadeInUp delay={100}>
        <View style={styles.field}>
          <Text variant="label" tone="text" nativeID="pet-name-label">
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Companion name"
            placeholderTextColor={colors.faint}
            style={styles.input}
            maxLength={24}
            returnKeyType="done"
            accessibilityLabel="Companion name"
            accessibilityLabelledBy="pet-name-label"
          />
          <Text variant="caption" tone="faint">
            2 to 24 characters
          </Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={140}>
        <SectionHeader title="Species" />
      </FadeInUp>
      <View style={styles.speciesRow}>
        {speciesOptions.map((option) => {
          const selected = species === option.value;
          return (
            <PressableScale
              key={option.value}
              onPress={() => {
                selection();
                setSpecies(option.value);
              }}
              accessibilityLabel={`Choose ${option.title}`}
              accessibilityState={{ selected }}
              style={[styles.speciesCard, selected && styles.selected]}
            >
              <PetCreature species={option.value} size={56} mood="happy" />
              <Text variant="label" tone="text">
                {option.title}
              </Text>
              <Text variant="caption" tone="muted" align="center">
                {option.copy}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <FadeInUp delay={180}>
        <SectionHeader title="Temperament" />
      </FadeInUp>
      <View style={styles.personalityGrid}>
        {personalityOptions.map((option) => {
          const selected = personality === option.value;
          return (
            <PressableScale
              key={option.value}
              onPress={() => {
                selection();
                setPersonality(option.value);
              }}
              accessibilityLabel={`Choose ${option.title}`}
              accessibilityState={{ selected }}
              style={[styles.personalityCard, selected && styles.selected]}
            >
              <Text variant="label" tone="text">
                {option.title}
              </Text>
              <Text variant="caption" tone="muted">
                {option.copy}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <MessageBanner tone="error" message={error} />

      <FadeInUp delay={220}>
        <Button
          icon="paw"
          label={loading ? 'Adopting…' : `Adopt ${trimmed || 'companion'}`}
          onPress={() => {
            tapMedium();
            onAdopted({ name: trimmed, species, personality });
          }}
          disabled={!canAdopt}
          loading={loading}
        />
        <Text variant="caption" tone="faint" align="center" style={styles.note}>
          {label(species)} · {label(personality)} · level 1
        </Text>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm },
  field: { gap: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 22,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  speciesRow: { flexDirection: 'row', gap: spacing.sm },
  speciesCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 132,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
  },
  personalityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  personalityCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 4,
    minHeight: 88,
    padding: spacing.md,
  },
  selected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.borderAccent,
  },
  note: { marginTop: spacing.sm },
});
