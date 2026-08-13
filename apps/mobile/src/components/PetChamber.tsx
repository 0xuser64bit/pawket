import type { PetSpecies } from '@pawket/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, gradients, isCompactWidth, speciesAccent, shadows, spacing } from '../theme/tokens';
import { Breathing, Floating } from './Motion';
import { PetCreature } from './PetCreature';
import { CARE_REACTIONS, FloatingXP, ParticleBurst, type CareReaction } from './PetReaction';
import { Text } from './Text';

const NATIVE = Platform.OS !== 'web';

/** A one-shot care reaction the chamber should play. `nonce` re-fires it. */
export type ChamberReaction = { type: CareReaction; nonce: number; xp?: number };

function resolveAccent(species?: PetSpecies | string): string {
  if (species === 'moss_pup') return speciesAccent.moss_pup;
  if (species === 'cloud_bun') return speciesAccent.cloud_bun;
  return speciesAccent.luna_cat;
}

export function PetChamber({
  species,
  mood = 'Radiant',
  compact = false,
  size,
  reaction = null,
}: {
  species?: PetSpecies | string;
  mood?: string;
  compact?: boolean;
  size?: number;
  reaction?: ChamberReaction | null;
}) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const small = isCompactWidth(width);
  const accent = resolveAccent(species);
  const minHeight = compact ? (small ? 176 : 196) : small ? 228 : 268;
  const creatureSize = size ?? (compact ? (small ? 128 : 148) : small ? 168 : 200);

  const [moodOverride, setMoodOverride] = useState<string | null>(null);
  const bounce = useRef(new Animated.Value(0)).current;
  const config = reaction ? CARE_REACTIONS[reaction.type] : null;

  useEffect(() => {
    if (!reaction || !config) return;
    setMoodOverride(config.mood);
    const moodTimer = setTimeout(() => setMoodOverride(null), 1400);

    if (reduced) return () => clearTimeout(moodTimer);

    bounce.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(bounce, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: NATIVE,
      }),
      Animated.spring(bounce, {
        toValue: 0,
        damping: 6,
        stiffness: 150,
        mass: 0.7,
        useNativeDriver: NATIVE,
      }),
    ]);
    anim.start();
    return () => {
      clearTimeout(moodTimer);
      anim.stop();
    };
  }, [reaction?.nonce]);

  const bounceScale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const activeMood = moodOverride ?? mood;

  return (
    <LinearGradient
      colors={gradients.chamber}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.chamber, { minHeight }, shadows.lamp]}
    >
      <View pointerEvents="none" style={styles.glow} />

      <View
        pointerEvents="none"
        style={[styles.floor, { backgroundColor: `${accent}33`, bottom: compact ? 36 : 48 }]}
      />

      <Floating distance={5}>
        <Animated.View style={{ transform: [{ scale: bounceScale }] }}>
          <Breathing amount={0.028}>
            <PetCreature mood={activeMood} species={species} size={creatureSize} />
          </Breathing>
        </Animated.View>
      </Floating>

      {config ? (
        <ParticleBurst
          nonce={reaction!.nonce}
          icon={config.icon}
          color={config.color}
          count={config.count}
        />
      ) : null}
      {reaction?.xp ? <FloatingXP nonce={reaction.nonce} amount={reaction.xp} /> : null}

      <View pointerEvents="none" style={styles.moodLayer}>
        <Text variant="meta" tone="muted">
          {activeMood}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  chamber: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: 160,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing.lg,
  },
  glow: {
    alignSelf: 'center',
    backgroundColor: colors.lamp,
    borderRadius: 140,
    height: 220,
    position: 'absolute',
    top: 8,
    width: 220,
  },
  floor: {
    borderRadius: 999,
    height: 16,
    opacity: 0.7,
    position: 'absolute',
    transform: [{ scaleX: 1.5 }],
    width: '44%',
  },
  moodLayer: {
    alignItems: 'center',
    bottom: spacing.sm,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
