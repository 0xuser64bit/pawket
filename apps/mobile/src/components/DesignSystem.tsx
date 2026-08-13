import { Ionicons } from '@expo/vector-icons';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { tapLight } from '../feedback/haptics';
import { colors, motion, radius, shadows, spacing } from '../theme/tokens';
import { PressableScale } from './Motion';
import { Text } from './Text';

type IconName = ComponentProps<typeof Ionicons>['name'];
type SemanticTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const toneToColor: Record<SemanticTone, string> = {
  accent: colors.accent,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  neutral: colors.muted,
};

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Surface({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return <View style={[styles.panel, padded && styles.panelPad, style]}>{children}</View>;
}

/** @deprecated Use Surface. Kept so older call sites keep compiling during the rework. */
export const GlassPanel = Surface;

export function IconTile({
  icon,
  tone = 'accent',
  size = 44,
}: {
  icon: IconName;
  tone?: SemanticTone;
  size?: number;
}) {
  const color = toneToColor[tone];
  return (
    <View
      style={[
        styles.iconTile,
        {
          width: size,
          height: size,
          borderRadius: size / 3.2,
          backgroundColor: colors.surfaceRaised,
        },
      ]}
    >
      <Ionicons color={color} name={icon} size={size * 0.44} />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

// ---------------------------------------------------------------------------
// Typographic structure
// ---------------------------------------------------------------------------

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="h2" tone="text" style={styles.sectionTitle}>
        {title}
      </Text>
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
  tone?: SemanticTone;
  icon?: IconName;
}) {
  const color = toneToColor[tone];
  return (
    <View
      style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
    >
      {icon ? <Ionicons color={color} name={icon} size={12} /> : null}
      <Text variant="meta" style={{ color }}>
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
  tone?: 'primary' | 'ghost' | 'danger';
  size?: 'lg' | 'md' | 'sm';
  full?: boolean;
}) {
  const isGhost = tone === 'ghost';
  const isDanger = tone === 'danger';
  const height = size === 'lg' ? 54 : size === 'md' ? 48 : 40;
  const padH = size === 'sm' ? spacing.md : spacing.xl;
  const isDisabled = disabled || loading;
  const ink = isGhost ? colors.text : isDanger ? colors.text : colors.accentInk;
  const fill = isGhost ? colors.surfaceRaised : isDanger ? colors.danger : colors.accent;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={label}
      style={[full ? styles.btnFull : styles.btnAuto, isDisabled && styles.disabled]}
    >
      <View
        style={[
          styles.btnShell,
          {
            backgroundColor: fill,
            borderColor: isGhost ? colors.borderStrong : fill,
            minHeight: height,
            paddingHorizontal: padH,
          },
          !isGhost && !isDisabled ? shadows.e1 : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={ink} />
        ) : (
          <>
            {icon ? <Ionicons color={ink} name={icon} size={18} /> : null}
            <Text
              variant="label"
              style={{
                color: ink,
                fontSize: size === 'sm' ? 14 : 16,
              }}
            >
              {label}
            </Text>
            {trailingIcon ? <Ionicons color={ink} name={trailingIcon} size={18} /> : null}
          </>
        )}
      </View>
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  height = 8,
}: {
  value: number;
  max?: number;
  tone?: Exclude<SemanticTone, 'neutral'>;
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
      <Animated.View style={[styles.progressFill, { width, height, backgroundColor: color }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function StateBlock({
  title,
  copy,
  icon = 'paw-outline',
  loading = false,
  action,
}: {
  title: string;
  copy: string;
  icon?: IconName;
  loading?: boolean;
  tone?: SemanticTone;
  action?: ReactNode;
}) {
  return (
    <Surface style={styles.stateBlock}>
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Ionicons color={colors.accent} name={icon} size={24} />
        )}
      </View>
      <Text variant="h2" tone="text" align="center">
        {title}
      </Text>
      <Text variant="body" tone="muted" align="center">
        {copy}
      </Text>
      {action}
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// Bottom navigation
// ---------------------------------------------------------------------------

const navItems: { href: string; label: string; icon: IconName; activeIcon: IconName }[] = [
  { href: '/home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { href: '/passport', label: 'Passport', icon: 'book-outline', activeIcon: 'book' },
  { href: '/seasons', label: 'Seasons', icon: 'flower-outline', activeIcon: 'flower' },
];

function NavItem({ item, active }: { item: (typeof navItems)[number]; active: boolean }) {
  return (
    <View style={styles.navSlot}>
      <Link href={item.href} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: active }}
          onPress={() => {
            if (!active) tapLight();
          }}
          style={styles.navItem}
        >
          <Ionicons
            color={active ? colors.accent : colors.faint}
            name={active ? item.activeIcon : item.icon}
            size={22}
          />
          <Text variant="meta" style={{ color: active ? colors.text : colors.faint }}>
            {item.label}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navBar, { paddingBottom: Math.max(10, insets.bottom) }]}>
      {navItems.map((item) => (
        <NavItem key={item.href} item={item} active={pathname === item.href} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  panelPad: { padding: spacing.lg },
  iconTile: {
    alignItems: 'center',
    borderCurve: 'continuous',
    justifyContent: 'center',
  },
  divider: { backgroundColor: colors.border, height: 1 },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  sectionTitle: { flex: 1 },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  btnFull: { alignSelf: 'stretch' },
  btnAuto: { alignSelf: 'flex-start' },
  btnShell: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
  progressTrack: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: radius.pill,
  },
  stateBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 52,
  },
  navBar: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
  },
  navSlot: { flex: 1, minWidth: 0 },
  navItem: {
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingVertical: 4,
    width: '100%',
  },
});
