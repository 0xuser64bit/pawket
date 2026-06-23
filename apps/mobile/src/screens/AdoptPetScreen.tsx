import { Ionicons } from '@expo/vector-icons';
import { PetPersonality, PetSpecies, type Pet } from '@pawket/shared';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, GlassPanel, Pill, SectionHeader } from '../components/DesignSystem';
import { FadeInUp, PressableScale } from '../components/Motion';
import { MessageBanner } from '../components/MessageBanner';
import { PetChamber } from '../components/PetChamber';
import { PetCreature } from '../components/PetCreature';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { selection, tapMedium } from '../feedback/haptics';
import { colors, radius, spacing } from '../theme/tokens';

const speciesOptions: { value: Pet['species']; title: string; copy: string }[] = [
  { value: PetSpecies.LunaCat, title: 'Luna Cat', copy: 'Moonlit & precise' },
  { value: PetSpecies.MossPup, title: 'Moss Pup', copy: 'Loyal & kinetic' },
  { value: PetSpecies.CloudBun, title: 'Cloud Bun', copy: 'Soft & swift' },
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
    copy: 'Bonds through streaks.',
    icon: 'bonfire-outline',
  },
  {
    value: PetPersonality.Brave,
    title: 'Brave',
    copy: 'Built for quests.',
    icon: 'shield-outline',
  },
  {
    value: PetPersonality.Mischief,
    title: 'Mischief',
    copy: 'Chaotic, rare energy.',
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
  const trimmed = name.trim();
  const canAdopt = trimmed.length >= 2 && !loading;

  return (
    <Screen>
      <FadeInUp>
        <Pill tone="purple" icon="sparkles">
          Adoption chamber
        </Pill>
        <Text variant="title" tone="text" style={styles.title}>
          Claim your companion.
        </Text>
        <Text variant="body" tone="soft">
          Choose a body and a spark. Your companion is born the moment you adopt — and starts its
          Passport with you.
        </Text>
      </FadeInUp>

      {/* Live preview reacts to every choice */}
      <FadeInUp delay={80}>
        <PetChamber species={species} mood={label(personality)} compact />
      </FadeInUp>

      <FadeInUp delay={120}>
        <GlassPanel style={styles.namePanel}>
          <Text variant="micro" tone="purple">
            Name signal
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Companion name"
            placeholderTextColor={colors.faint}
            style={styles.input}
            maxLength={24}
            returnKeyType="done"
          />
        </GlassPanel>
      </FadeInUp>

      <FadeInUp delay={160}>
        <SectionHeader eyebrow="species" title="Pick a body" tone="cyan" />
      </FadeInUp>
      <View style={styles.speciesRow}>
        {speciesOptions.map((option, i) => {
          const selected = species === option.value;
          return (
            <FadeInUp key={option.value} delay={180 + i * 40} style={styles.flex}>
              <PressableScale
                onPress={() => {
                  selection();
                  setSpecies(option.value);
                }}
                accessibilityLabel={`Choose ${option.title}`}
                style={[styles.speciesCard, selected && styles.selected]}
              >
                {selected ? (
                  <View style={styles.check}>
                    <Ionicons color={colors.black} name="checkmark" size={12} />
                  </View>
                ) : null}
                <PetCreature species={option.value} size={58} mood="happy" />
                <Text variant="label" tone="text">
                  {option.title}
                </Text>
                <Text variant="caption" tone="muted" align="center">
                  {option.copy}
                </Text>
              </PressableScale>
            </FadeInUp>
          );
        })}
      </View>

      <FadeInUp delay={300}>
        <SectionHeader eyebrow="personality" title="Tune the spark" tone="magenta" />
      </FadeInUp>
      <View style={styles.personalityGrid}>
        {personalityOptions.map((option, i) => {
          const selected = personality === option.value;
          return (
            <FadeInUp key={option.value} delay={320 + i * 40} style={styles.half}>
              <PressableScale
                onPress={() => {
                  selection();
                  setPersonality(option.value);
                }}
                accessibilityLabel={`Choose ${option.title}`}
                style={[styles.personalityCard, selected && styles.selected]}
              >
                <Ionicons
                  color={selected ? colors.solanaGreen : colors.muted}
                  name={option.icon}
                  size={22}
                />
                <Text variant="label" tone="text">
                  {option.title}
                </Text>
                <Text variant="caption" tone="muted">
                  {option.copy}
                </Text>
              </PressableScale>
            </FadeInUp>
          );
        })}
      </View>

      <MessageBanner tone="error" message={error} />

      <FadeInUp delay={480}>
        <Button
          icon="sparkles"
          label={loading ? 'Opening chamber…' : `Adopt ${trimmed || 'companion'}`}
          onPress={() => {
            tapMedium();
            onAdopted({ name: trimmed, species, personality });
          }}
          disabled={!canAdopt}
          loading={loading}
        />
        <Text variant="caption" tone="faint" align="center" style={styles.note}>
          Creates {label(species)} · {label(personality)} · level 1 · fresh passport
        </Text>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md, marginBottom: 6 },
  flex: { flex: 1 },
  half: { minWidth: '45%', flexGrow: 1, flexBasis: '45%' },
  namePanel: { gap: spacing.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: colors.borderStrong,
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  speciesRow: { flexDirection: 'row', gap: spacing.sm },
  speciesCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
  },
  personalityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  personalityCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 5,
    minHeight: 104,
    padding: spacing.md,
  },
  selected: {
    backgroundColor: 'rgba(23,229,137,0.10)',
    borderColor: 'rgba(23,229,137,0.6)',
  },
  check: {
    alignItems: 'center',
    backgroundColor: colors.solanaGreen,
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 20,
    zIndex: 2,
  },
  note: { marginTop: spacing.sm },
});
