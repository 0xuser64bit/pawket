import type { PetSpecies } from '@pawket/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, gradients, motion, radius, speciesAccent, spacing } from '../theme/tokens';
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

/** A single expanding aura ring; centered by its parent overlay. */
function AuraRing({ color, size, delay }: { color: string; size: number; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: motion.pulse,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: NATIVE,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, v]);

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.45] });
  const opacity = v.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.45, 0] });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
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
  const accent = resolveAccent(species);
  const minHeight = compact ? 208 : 296;
  const creatureSize = size ?? (compact ? 156 : 212);
  const ringSize = creatureSize * 0.92;

  // A care ritual briefly overrides the resting mood + bursts particles, so the
  // creature visibly *responds* to being cared for.
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
    // Intentionally keyed on nonce so the same reaction type can re-fire.
  }, [reaction?.nonce]);

  const bounceScale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const activeMood = moodOverride ?? mood;

  return (
    <LinearGradient
      colors={gradients.chamber}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.chamber, { minHeight }]}
    >
      {/* Tinted depth orbs */}
      <View
        pointerEvents="none"
        style={[styles.depthOrb, { backgroundColor: `${accent}26`, top: -40, right: -30 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.depthOrb, { backgroundColor: `${colors.cyan}1f`, bottom: -50, left: -40 }]}
      />

      {/* Static structural rings */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <View
          style={[
            styles.staticRing,
            { width: ringSize * 1.35, height: ringSize * 1.35, borderColor: `${accent}22` },
          ]}
        />
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <View
          style={[
            styles.staticRing,
            { width: ringSize, height: ringSize, borderColor: `${accent}3a` },
          ]}
        />
      </View>

      {/* Animated aura pulses */}
      {!reduced ? (
        <>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
            <AuraRing color={accent} size={ringSize} delay={0} />
          </View>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
            <AuraRing color={accent} size={ringSize} delay={motion.pulse / 2} />
          </View>
        </>
      ) : null}

      {/* Floor glow */}
      <View
        pointerEvents="none"
        style={[styles.floor, { backgroundColor: `${accent}33`, bottom: compact ? 30 : 44 }]}
      />

      {/* The companion */}
      <Floating>
        <Animated.View style={{ transform: [{ scale: bounceScale }] }}>
          <Breathing amount={0.035}>
            <PetCreature mood={activeMood} species={species} size={creatureSize} />
          </Breathing>
        </Animated.View>
      </Floating>

      {/* Care reaction overlays, centered on the creature */}
      {config ? (
        <ParticleBurst
          nonce={reaction!.nonce}
          icon={config.icon}
          color={config.color}
          count={config.count}
        />
      ) : null}
      {reaction?.xp ? <FloatingXP nonce={reaction.nonce} amount={reaction.xp} /> : null}

      {/* Mood readout */}
      <View pointerEvents="none" style={styles.moodLayer}>
        <View style={styles.moodPill}>
          <View style={[styles.statusDot, { backgroundColor: accent }]} />
          <Text variant="micro" tone="text">
            {activeMood}
          </Text>
        </View>
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
    overflow: 'hidden',
    padding: spacing.lg,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  depthOrb: {
    borderRadius: 130,
    height: 180,
    position: 'absolute',
    width: 180,
  },
  staticRing: {
    borderRadius: 999,
    borderWidth: 1,
    position: 'absolute',
  },
  floor: {
    borderRadius: 999,
    height: 26,
    opacity: 0.8,
    position: 'absolute',
    width: '52%',
    transform: [{ scaleX: 1.6 }],
  },
  moodLayer: {
    alignItems: 'center',
    bottom: spacing.md,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  moodPill: {
    alignItems: 'center',
    backgroundColor: colors.glassLo,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusDot: { borderRadius: 999, height: 8, width: 8 },
});
