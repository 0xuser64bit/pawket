import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, radius, shadows, spacing } from '../theme/tokens';
import { Text } from './Text';

const NATIVE = Platform.OS !== 'web';
type IconName = ComponentProps<typeof Ionicons>['name'];

const CONFETTI = [
  colors.accent,
  colors.accentHover,
  colors.success,
  colors.textSoft,
  colors.warning,
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
    const next: Piece[] = Array.from({ length: 20 }, (_, i) => ({
      id: `${runKey}-${i}`,
      color: CONFETTI[i % CONFETTI.length]!,
      x: (Math.random() - 0.5) * 280,
      drop: 220 + Math.random() * 220,
      size: 6 + Math.random() * 6,
      delay: Math.random() * 160,
      spin: (Math.random() - 0.5) * 6,
      v: new Animated.Value(0),
    }));
    setPieces(next);
    const anims = next.map((p) =>
      Animated.timing(p.v, {
        toValue: 1,
        duration: 1400 + Math.random() * 500,
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
        const translateY = p.v.interpolate({ inputRange: [0, 1], outputRange: [-24, p.drop] });
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
                height: p.size * 1.5,
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
      damping: 14,
      stiffness: 170,
      mass: 0.8,
      useNativeDriver: NATIVE,
    });
    anim.start();
    const timer = setTimeout(onDone, reduced ? 1500 : 2200);
    return () => {
      anim.stop();
      clearTimeout(timer);
    };
  }, [payload, reduced, pop, onDone]);

  if (!payload) return null;

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });

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
          <Ionicons name={payload.icon ?? 'paw'} size={28} color={colors.inverse} />
        </View>
        <Text variant="h1" tone="text" align="center">
          {payload.title}
        </Text>
        {payload.subtitle ? (
          <Text variant="body" tone="soft" align="center">
            {payload.subtitle}
          </Text>
        ) : null}
        <Text variant="meta" tone="faint" align="center" style={styles.tap}>
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
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderCurve: 'continuous',
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    maxWidth: 300,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    ...shadows.e3,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 60,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 60,
  },
  tap: { marginTop: spacing.sm },
});
