import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, motion, radius } from '../theme/tokens';

// Native driver is unsupported on react-native-web; fall back gracefully.
const NATIVE = Platform.OS !== 'web';

/** Slow, organic scale loop — gives the pet/orbs a "breathing" life. */
export function Breathing({
  children,
  amount = 0.03,
  duration = motion.breathe,
  style,
}: {
  children: ReactNode;
  amount?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, duration, v]);

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + amount] });
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** Gentle vertical float loop. */
export function Floating({
  children,
  distance = 7,
  duration = motion.float,
  style,
}: {
  children: ReactNode;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, duration, v]);

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Expanding + fading ring used as an "aura pulse" behind glowing elements. */
export function Halo({
  color = colors.accent,
  size,
  delay = 0,
  duration = motion.pulse,
  style,
}: {
  color?: string;
  size: number;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: NATIVE,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, duration, delay, v]);

  if (reduced) return null;

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] });
  const opacity = v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
          position: 'absolute',
          opacity,
          transform: [{ scale }],
        },
        style,
      ]}
    />
  );
}

/** Entrance: fade + rise. Use `delay` to stagger a list/grid. */
export function FadeInUp({
  children,
  delay = 0,
  distance = 8,
  duration = motion.base,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    const anim = Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    });
    anim.start();
    return () => anim.stop();
  }, [reduced, delay, duration, v]);

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/** Pressable that springs to a smaller scale while held. */
export function PressableScale({
  children,
  onPress,
  disabled = false,
  scaleTo = 0.96,
  style,
  hitSlop,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
  accessibilityState?: { disabled?: boolean; selected?: boolean };
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;

  const spring = (toValue: number) =>
    Animated.spring(v, { toValue, useNativeDriver: NATIVE, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => !reduced && !disabled && spring(scaleTo)}
      onPressOut={() => !reduced && !disabled && spring(1)}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
    >
      <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Shimmering skeleton block for loading states. */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced || w === 0) return;
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: NATIVE,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, w, v]);

  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [-w, w] });

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: rounded }, styles.skeleton, style]}
    >
      {!reduced && w > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={['transparent', 'rgba(244,233,216,0.10)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
});
