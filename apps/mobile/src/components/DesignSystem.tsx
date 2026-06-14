import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, usePathname } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';
import { colors, gradients, radius, shadows, spacing, typography } from '../theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];
type GradientName = keyof typeof gradients;

export function GlassPanel({
  children,
  style,
  glow = false,
}: {
  children: ReactNode;
  style?: object;
  glow?: boolean;
}) {
  return (
    <LinearGradient
      colors={gradients.glass}
      style={[styles.panel, glow && shadows.glowPurple, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled = false,
  icon,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName;
  tone?: 'primary' | 'green' | 'purple' | 'magenta' | 'amber' | 'ghost' | 'danger';
}) {
  const gradient: GradientName =
    tone === 'green'
      ? 'green'
      : tone === 'purple'
        ? 'purple'
        : tone === 'magenta'
          ? 'magenta'
          : tone === 'amber'
            ? 'amber'
            : tone === 'danger'
              ? 'danger'
              : 'primary';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonPressable,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {tone === 'ghost' ? (
        <View style={styles.ghostButton}>
          {icon ? <Ionicons color={colors.text} name={icon} size={18} /> : null}
          <Text style={styles.ghostButtonText}>{label}</Text>
        </View>
      ) : (
        <LinearGradient colors={gradients[gradient]} style={styles.gradientButton}>
          {icon ? <Ionicons color={colors.black} name={icon} size={18} /> : null}
          <Text style={styles.buttonText}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'purple' | 'cyan' | 'amber' | 'danger';
}) {
  const color =
    tone === 'green'
      ? colors.solanaGreen
      : tone === 'purple'
        ? colors.solanaPurple
        : tone === 'cyan'
          ? colors.cyan
          : tone === 'amber'
            ? colors.amber
            : tone === 'danger'
              ? colors.danger
              : colors.muted;
  return (
    <View style={[styles.pill, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}>
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'green',
  height = 9,
}: {
  value: number;
  max?: number;
  tone?: 'green' | 'purple' | 'cyan' | 'amber' | 'magenta' | 'danger';
  height?: number;
}) {
  const percent =
    `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%` as DimensionValue;
  const fill =
    tone === 'purple'
      ? colors.solanaPurple
      : tone === 'cyan'
        ? colors.cyan
        : tone === 'amber'
          ? colors.amber
          : tone === 'magenta'
            ? colors.magenta
            : tone === 'danger'
              ? colors.danger
              : colors.solanaGreen;
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[styles.progressFill, { width: percent, backgroundColor: fill, height }]} />
    </View>
  );
}

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
  tone?: 'cyan' | 'green' | 'purple' | 'amber' | 'danger';
  action?: ReactNode;
}) {
  const color =
    tone === 'green'
      ? colors.solanaGreen
      : tone === 'purple'
        ? colors.solanaPurple
        : tone === 'amber'
          ? colors.amber
          : tone === 'danger'
            ? colors.danger
            : colors.cyan;
  return (
    <GlassPanel style={styles.stateBlock}>
      <View
        style={[styles.stateIcon, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}
      >
        {loading ? (
          <ActivityIndicator color={color} />
        ) : (
          <Ionicons color={color} name={icon} size={24} />
        )}
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateCopy}>{copy}</Text>
      {action}
    </GlassPanel>
  );
}

const navItems: { href: string; label: string; icon: IconName }[] = [
  { href: '/home', label: 'Home', icon: 'planet-outline' },
  { href: '/passport', label: 'Passport', icon: 'id-card-outline' },
  { href: '/store', label: 'Store', icon: 'diamond-outline' },
  { href: '/friends', label: 'Friends', icon: 'people-outline' },
  { href: '/events', label: 'Events', icon: 'flash-outline' },
  { href: '/settings', label: 'Settings', icon: 'settings-outline' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <View style={styles.navShell}>
      <View style={styles.navBar}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable style={[styles.navItem, active && styles.navItemActive]}>
                <Ionicons
                  color={active ? colors.solanaGreen : colors.faint}
                  name={item.icon}
                  size={active ? 21 : 19}
                />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...typography.micro,
    color: colors.solanaGreen,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
  },
  buttonPressable: {
    borderRadius: radius.pill,
  },
  gradientButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ghostButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '900',
  },
  ghostButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radius.pill,
  },
  stateBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  stateIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  stateTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  stateCopy: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  navShell: {
    bottom: 0,
    left: 0,
    paddingBottom: 12,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
  },
  navBar: {
    backgroundColor: 'rgba(5,6,13,0.92)',
    borderColor: colors.borderStrong,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 7,
    ...shadows.panel,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: 21,
    flex: 1,
    gap: 3,
    minHeight: 48,
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: 'rgba(20,241,149,0.11)',
  },
  navLabel: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: '800',
  },
  navLabelActive: {
    color: colors.text,
  },
});
