import type { PetSpecies } from '@pawket/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors, gradients, radius, shadows, spacing } from '../theme/tokens';

function faceForSpecies(species?: PetSpecies) {
  if (species === 'moss_pup') return '◖•ᴥ•◗';
  if (species === 'cloud_bun') return '૮꒰˶ᵔ ᵕ ᵔ˶꒱ა';
  return 'ᓚᘏᗢ';
}

function speciesAccent(species?: PetSpecies) {
  if (species === 'moss_pup') return colors.solanaGreen;
  if (species === 'cloud_bun') return colors.cyan;
  return colors.solanaPurple;
}

export function PetAvatar({
  mood = 'Radiant',
  species,
  compact = false,
}: {
  mood?: string;
  species?: PetSpecies;
  compact?: boolean;
}) {
  const accent = speciesAccent(species);
  return (
    <LinearGradient colors={gradients.chamber} style={[styles.chamber, compact && styles.compact]}>
      <View style={[styles.ringOuter, { borderColor: `${accent}33` }]} />
      <View style={[styles.ringMiddle, { borderColor: `${accent}55` }]} />
      <View
        style={[
          styles.orb,
          { borderColor: `${accent}88`, backgroundColor: `${accent}12` },
          shadows.glowPurple,
        ]}
      >
        <Text style={[styles.face, compact && styles.faceCompact]}>{faceForSpecies(species)}</Text>
      </View>
      <View style={styles.moodPill}>
        <View style={[styles.statusDot, { backgroundColor: accent }]} />
        <Text style={styles.mood}>{mood}</Text>
      </View>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  chamber: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radius.xxl,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 260,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  compact: { minHeight: 190 },
  ringOuter: {
    borderRadius: 160,
    borderWidth: 1,
    height: 238,
    position: 'absolute',
    width: 238,
  },
  ringMiddle: {
    borderRadius: 115,
    borderWidth: 1,
    height: 172,
    position: 'absolute',
    transform: [{ rotate: '18deg' }],
    width: 210,
  },
  orb: {
    alignItems: 'center',
    borderRadius: 86,
    borderWidth: 1,
    height: 154,
    justifyContent: 'center',
    width: 154,
  },
  face: {
    color: colors.text,
    fontSize: 58,
    textShadowColor: 'rgba(20,241,149,0.28)',
    textShadowRadius: 12,
  },
  faceCompact: { fontSize: 48 },
  moodPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(3,4,10,0.68)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 20,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    position: 'absolute',
  },
  statusDot: { borderRadius: radius.pill, height: 8, width: 8 },
  mood: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
