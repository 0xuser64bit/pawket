import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, radius } from '../theme/tokens';
import { Text } from './Text';

const NATIVE = Platform.OS !== 'web';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The visual language a care ritual speaks when it lands on the pet. */
export type CareReaction = 'feed' | 'play' | 'groom' | 'rest' | 'celebrate';

export const CARE_REACTIONS: Record<
  CareReaction,
  { icon: IconName; color: string; mood: string; count: number }
> = {
  feed: { icon: 'nutrition', color: colors.accent, mood: 'happy', count: 7 },
  play: { icon: 'heart', color: colors.accent, mood: 'radiant', count: 8 },
  groom: { icon: 'sparkles', color: colors.success, mood: 'happy', count: 8 },
  rest: { icon: 'moon', color: colors.info, mood: 'tired', count: 5 },
  celebrate: { icon: 'star', color: colors.accent, mood: 'radiant', count: 12 },
};

type Particle = {
  id: string;
  x: number;
  size: number;
  distance: number;
  rotate: number;
  delay: number;
  v: Animated.Value;
};

/**
 * A short-lived burst of icons that rise and fade from the pet's center.
 * Re-fires whenever `nonce` changes; renders nothing under reduced motion.
 */
export function ParticleBurst({
  nonce,
  icon,
  color,
  count = 7,
}: {
  nonce: number;
  icon: IconName;
  color: string;
  count?: number;
}) {
  const reduced = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (reduced || !nonce) return;
    const next: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: `${nonce}-${i}`,
      x: (Math.random() - 0.5) * 130,
      size: 13 + Math.random() * 11,
      distance: 64 + Math.random() * 66,
      rotate: (Math.random() - 0.5) * 70,
      delay: Math.random() * 140,
      v: new Animated.Value(0),
    }));
    setParticles(next);
    const anims = next.map((p) =>
      Animated.timing(p.v, {
        toValue: 1,
        duration: 1100,
        delay: p.delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE,
      }),
    );
    Animated.parallel(anims).start(({ finished }) => {
      if (finished) setParticles([]);
    });
    return () => anims.forEach((a) => a.stop());
  }, [nonce, count, reduced]);

  if (reduced || particles.length === 0) return null;

  return (
    <View pointerEvents="none" style={styles.center}>
      {particles.map((p) => {
        const translateY = p.v.interpolate({ inputRange: [0, 1], outputRange: [8, -p.distance] });
        const translateX = p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] });
        const opacity = p.v.interpolate({
          inputRange: [0, 0.15, 0.7, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = p.v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.85] });
        const rotate = p.v.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.rotate}deg`],
        });
        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              { opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate }] },
            ]}
          >
            <Ionicons name={icon} size={p.size} color={color} />
          </Animated.View>
        );
      })}
    </View>
  );
}

/** A "+N XP" chip that floats up from the pet when a ritual earns XP. */
export function FloatingXP({ nonce, amount }: { nonce: number; amount: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  const v = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!nonce || amount <= 0) return;
    setShown(true);
    if (reduced) {
      const t = setTimeout(() => setShown(false), 900);
      return () => clearTimeout(t);
    }
    v.setValue(0);
    const anim = Animated.timing(v, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    });
    anim.start(({ finished }) => finished && setShown(false));
    return () => anim.stop();
  }, [nonce, amount, reduced, v]);

  if (!shown || amount <= 0) return null;

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -78] });
  const opacity = v.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const scale = v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.7, 1, 0.95] });

  return (
    <View pointerEvents="none" style={[styles.center, styles.xpAnchor]}>
      <Animated.View style={[styles.xpChip, { opacity, transform: [{ translateY }, { scale }] }]}>
        <Ionicons name="flash" size={13} color={colors.inverse} />
        <Text variant="label" tone="inverse" style={styles.xpText}>
          +{amount} XP
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: { position: 'absolute' },
  xpAnchor: { justifyContent: 'center' },
  xpChip: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  xpText: { fontSize: 13 },
});
