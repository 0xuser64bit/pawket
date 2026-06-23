import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, usePathname } from 'expo-router';
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { tapLight } from '../feedback/haptics';
import { colors, gradients, motion, radius, shadows, spacing } from '../theme/tokens';
import { Halo, PressableScale } from './Motion';
import { Text } from './Text';

type IconName = ComponentProps<typeof Ionicons>['name'];
type GradientName = keyof typeof gradients;
type Tone = 'green' | 'purple' | 'cyan' | 'magenta' | 'amber' | 'danger' | 'neutral';

const toneToColor: Record<Tone, string> = {
  green: colors.solanaGreen,
  purple: colors.solanaPurple,
  cyan: colors.cyan,
  magenta: colors.magenta,
  amber: colors.amber,
  danger: colors.danger,
  neutral: colors.muted,
};

const toneToGradient: Record<Exclude<Tone, 'neutral'>, GradientName> = {
  green: 'green',
  purple: 'purple',
  cyan: 'cyan',
  magenta: 'magenta',
  amber: 'amber',
  danger: 'danger',
};

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function GlassPanel({
  children,
  style,
  glow = false,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean | Tone;
  padded?: boolean;
}) {
  const glowStyle =
    glow === true
      ? shadows.glowPurple
      : glow === 'green'
        ? shadows.glowGreen
        : glow === 'cyan'
          ? shadows.glowCyan
          : glow === 'amber'
            ? shadows.glowAmber
            : glow
              ? shadows.glowPurple
              : shadows.e2;

  return (
    <View style={[styles.panel, padded && styles.panelPad, glowStyle, style]}>
      <LinearGradient
        colors={gradients.glass}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.panelEdge} />
      {children}
    </View>
  );
}

export function IconTile({
  icon,
  tone = 'green',
  size = 46,
  glow = false,
}: {
  icon: IconName;
  tone?: Tone;
  size?: number;
  glow?: boolean;
}) {
  const color = toneToColor[tone];
  return (
    <View
      style={[
        styles.iconTile,
        {
          width: size,
          height: size,
          borderRadius: size / 2.6,
          backgroundColor: `${color}1c`,
          borderColor: `${color}55`,
        },
      ]}
    >
      {glow ? <Halo color={color} size={size * 0.9} /> : null}
      <Ionicons color={color} name={icon} size={size * 0.46} />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

// ---------------------------------------------------------------------------
// Typographic structure
// ---------------------------------------------------------------------------

export function SectionHeader({
  eyebrow,
  title,
  action,
  tone = 'green',
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  tone?: Tone;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Text variant="eyebrow" style={{ color: toneToColor[tone], marginBottom: 5 }}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="h2" tone="text">
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export function Pill({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: IconName;
}) {
  const color = toneToColor[tone];
  return (
    <View style={[styles.pill, { borderColor: `${color}55`, backgroundColor: `${color}16` }]}>
      {icon ? <Ionicons color={color} name={icon} size={12} /> : null}
      <Text variant="micro" style={{ color }}>
        {children}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  trailingIcon,
  tone = 'primary',
  size = 'lg',
  full = true,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  trailingIcon?: IconName;
  tone?: 'primary' | 'green' | 'purple' | 'magenta' | 'amber' | 'cyan' | 'ghost' | 'danger';
  size?: 'lg' | 'md' | 'sm';
  full?: boolean;
}) {
  const isGhost = tone === 'ghost';
  const gradient: GradientName =
    tone === 'green'
      ? 'green'
      : tone === 'purple'
        ? 'purple'
        : tone === 'magenta'
          ? 'magenta'
          : tone === 'amber'
            ? 'amber'
            : tone === 'cyan'
              ? 'cyan'
              : tone === 'danger'
                ? 'danger'
                : 'primary';

  const height = size === 'lg' ? 56 : size === 'md' ? 48 : 40;
  const padH = size === 'sm' ? spacing.md : spacing.xl;
  const isDisabled = disabled || loading;

  const inner = (
    <View style={[styles.btnContent, { minHeight: height, paddingHorizontal: padH }]}>
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.text : colors.black} />
      ) : (
        <>
          {icon ? (
            <Ionicons color={isGhost ? colors.text : colors.black} name={icon} size={18} />
          ) : null}
          <Text
            variant="label"
            style={{
              color: isGhost ? colors.text : colors.black,
              fontSize: size === 'sm' ? 14 : 16,
            }}
          >
            {label}
          </Text>
          {trailingIcon ? (
            <Ionicons color={isGhost ? colors.text : colors.black} name={trailingIcon} size={18} />
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={label}
      style={[full ? styles.btnFull : styles.btnAuto, isDisabled && styles.disabled]}
    >
      {isGhost ? (
        <View style={[styles.ghostBtn, { borderRadius: radius.pill }]}>{inner}</View>
      ) : (
        <LinearGradient
          colors={gradients[gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBtn, !isDisabled && shadows.e1]}
        >
          {inner}
        </LinearGradient>
      )}
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function ProgressBar({
  value,
  max = 100,
  tone = 'green',
  height = 9,
  glow = false,
}: {
  value: number;
  max?: number;
  tone?: Exclude<Tone, 'neutral'>;
  height?: number;
  glow?: boolean;
}) {
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const [trackWidth, setTrackWidth] = useState(0);
  const anim = useRef(new Animated.Value(reduced ? pct : 0)).current;

  useEffect(() => {
    if (reduced) {
      anim.setValue(pct);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: pct,
      duration: motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [pct, reduced, anim]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth] });
  const color = toneToColor[tone];

  return (
    <View
      style={[styles.progressTrack, { height }]}
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.progressFill,
          { width, height },
          glow && { boxShadow: `0px 0px 8px ${color}` },
        ]}
      >
        <LinearGradient
          colors={gradients[toneToGradient[tone]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: trackWidth, height }}
        />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function StateBlock({
  title,
  copy,
  icon = 'sparkles-outline',
  loading = false,
  tone = 'cyan',
  action,
}: {
  title: string;
  copy: string;
  icon?: IconName;
  loading?: boolean;
  tone?: Tone;
  action?: ReactNode;
}) {
  const color = toneToColor[tone];
  return (
    <GlassPanel style={styles.stateBlock}>
      <View
        style={[styles.stateIcon, { borderColor: `${color}55`, backgroundColor: `${color}16` }]}
      >
        {loading ? <Halo color={color} size={58} /> : null}
        {loading ? (
          <ActivityIndicator color={color} />
        ) : (
          <Ionicons color={color} name={icon} size={26} />
        )}
      </View>
      <Text variant="h2" tone="text" align="center">
        {title}
      </Text>
      <Text variant="body" tone="muted" align="center">
        {copy}
      </Text>
      {action}
    </GlassPanel>
  );
}

// ---------------------------------------------------------------------------
// Bottom navigation (5 top-level tabs; Settings lives in screen headers)
// ---------------------------------------------------------------------------

const navItems: { href: string; label: string; icon: IconName; activeIcon: IconName }[] = [
  { href: '/home', label: 'Home', icon: 'planet-outline', activeIcon: 'planet' },
  {
    href: '/passport',
    label: 'Passport',
    icon: 'finger-print-outline',
    activeIcon: 'finger-print',
  },
  { href: '/seasons', label: 'Seasons', icon: 'flash-outline', activeIcon: 'flash' },
];

function NavItem({ item, active }: { item: (typeof navItems)[number]; active: boolean }) {
  return (
    <Link key={item.href} href={item.href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
        onPress={() => {
          if (!active) tapLight();
        }}
        style={styles.navItem}
      >
        <View style={[styles.navPill, active && styles.navPillActive]}>
          <Ionicons
            color={active ? colors.solanaGreen : colors.faint}
            name={active ? item.activeIcon : item.icon}
            size={21}
          />
        </View>
        <Text variant="micro" style={{ color: active ? colors.text : colors.faint, fontSize: 9.5 }}>
          {item.label}
        </Text>
        <View style={[styles.navIndicator, active && styles.navIndicatorActive]} />
      </Pressable>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <View style={styles.navShell} pointerEvents="box-none">
      <View style={styles.navBar}>
        <View pointerEvents="none" style={styles.panelEdge} />
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} active={pathname === item.href} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  panelPad: { padding: spacing.lg },
  panelEdge: {
    backgroundColor: colors.glassHi,
    height: 1,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: 0,
  },
  iconTile: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },
  divider: { backgroundColor: colors.border, height: 1 },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  btnFull: { alignSelf: 'stretch', borderRadius: radius.pill },
  btnAuto: { alignSelf: 'flex-start', borderRadius: radius.pill },
  btnContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  gradientBtn: { borderRadius: radius.pill, overflow: 'hidden' },
  ghostBtn: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    overflow: 'hidden',
  },
  disabled: { opacity: 0.45 },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  stateBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  stateIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 58,
  },
  navShell: {
    bottom: 0,
    left: 0,
    paddingBottom: 14,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  navBar: {
    alignSelf: 'center',
    backgroundColor: 'rgba(8,10,20,0.94)',
    borderColor: colors.borderStrong,
    borderCurve: 'continuous',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 480,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 9,
    width: '100%',
    ...shadows.e3,
  },
  navItem: { alignItems: 'center', flex: 1, gap: 4 },
  navPill: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 52,
  },
  navPillActive: { backgroundColor: 'rgba(23,229,137,0.13)' },
  navIndicator: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    height: 3,
    marginTop: 1,
    width: 14,
  },
  navIndicatorActive: { backgroundColor: colors.solanaGreen },
});
