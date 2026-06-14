import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, radius, shadows, spacing } from '../theme/tokens';
import { Text } from './Text';

const NATIVE = Platform.OS !== 'web';
type IconName = ComponentProps<typeof Ionicons>['name'];

const CONFETTI = [
  colors.solanaGreen,
  colors.cyan,
  colors.solanaPurple,
  colors.magenta,
  colors.gold,
  colors.amber,
];

export type CelebrationPayload = {
  key: number;
  title: string;
  subtitle?: string;
  icon?: IconName;
};

type Piece = {
  id: string;
  color: string;
  x: number;
  drop: number;
  size: number;
  delay: number;
  spin: number;
  v: Animated.Value;
};

function ConfettiField({ runKey }: { runKey: number }) {
  const reduced = useReducedMotion();
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (reduced || !runKey) return;
    const next: Piece[] = Array.from({ length: 28 }, (_, i) => ({
      id: `${runKey}-${i}`,
      color: CONFETTI[i % CONFETTI.length]!,
      x: (Math.random() - 0.5) * 320,
      drop: 240 + Math.random() * 260,
      size: 7 + Math.random() * 7,
      delay: Math.random() * 180,
      spin: (Math.random() - 0.5) * 8,
      v: new Animated.Value(0),
    }));
    setPieces(next);
    const anims = next.map((p) =>
      Animated.timing(p.v, {
        toValue: 1,
        duration: 1500 + Math.random() * 600,
        delay: p.delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE,
      }),
    );
    Animated.parallel(anims).start(({ finished }) => finished && setPieces([]));
    return () => anims.forEach((a) => a.stop());
  }, [runKey, reduced]);

  if (reduced || pieces.length === 0) return null;

  return (
    <View pointerEvents="none" style={styles.confetti}>
      {pieces.map((p) => {
        const translateY = p.v.interpolate({ inputRange: [0, 1], outputRange: [-30, p.drop] });
        const translateX = p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] });
        const opacity = p.v.interpolate({
          inputRange: [0, 0.1, 0.75, 1],
          outputRange: [0, 1, 1, 0],
        });
        const rotate = p.v.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.spin * 360}deg`],
        });
        return (
          <Animated.View
            key={p.id}
            style={[
              styles.piece,
              {
                width: p.size,
                height: p.size * 1.6,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/**
 * Full-bleed celebratory moment for the product's big payoff beats — level ups,
 * sealed streaks, claimed rewards. Auto-dismisses; tap to dismiss early.
 */
export function Celebration({
  payload,
  onDone,
}: {
  payload: CelebrationPayload | null;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!payload) return;
    pop.setValue(0);
    const anim = Animated.spring(pop, {
      toValue: 1,
      damping: 11,
      stiffness: 160,
      mass: 0.8,
      useNativeDriver: NATIVE,
    });
    anim.start();
    const timer = setTimeout(onDone, reduced ? 1600 : 2400);
    return () => {
      anim.stop();
      clearTimeout(timer);
    };
  }, [payload, reduced, pop, onDone]);

  if (!payload) return null;

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <Pressable
      style={styles.root}
      onPress={onDone}
      accessibilityRole="button"
      accessibilityLabel="Dismiss celebration"
    >
      <View pointerEvents="none" style={styles.scrim} />
      <ConfettiField runKey={payload.key} />
      <Animated.View style={[styles.card, { opacity: pop, transform: [{ scale }] }]}>
        <View style={styles.badge}>
          <Ionicons name={payload.icon ?? 'sparkles'} size={32} color={colors.black} />
        </View>
        <Text variant="h1" tone="text" align="center">
          {payload.title}
        </Text>
        {payload.subtitle ? (
          <Text variant="body" tone="soft" align="center">
            {payload.subtitle}
          </Text>
        ) : null}
        <Text variant="micro" tone="faint" align="center" style={styles.tap}>
          Tap to continue
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  confetti: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  piece: { borderRadius: 2, position: 'absolute' },
  card: {
    alignItems: 'center',
    backgroundColor: colors.cardSoft,
    borderColor: colors.borderStrong,
    borderCurve: 'continuous',
    borderRadius: radius.xxl,
    borderWidth: 1,
    gap: spacing.xs,
    maxWidth: 320,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    ...shadows.glowPurple,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    height: 68,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 68,
    ...shadows.glowAmber,
  },
  tap: { marginTop: spacing.sm },
});
