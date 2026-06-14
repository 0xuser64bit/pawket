import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { AnimatedCount } from './AnimatedCount';
import { GlassPanel, ProgressBar } from './DesignSystem';
import { Text } from './Text';

type IconName = ComponentProps<typeof Ionicons>['name'];
type BarTone = 'green' | 'purple' | 'cyan' | 'amber' | 'magenta';

const config = (label: string): { color: string; tone: BarTone; icon: IconName } => {
  const key = label.toLowerCase();
  if (key.includes('hunger'))
    return { color: colors.amber, tone: 'amber', icon: 'nutrition-outline' };
  if (key.includes('happiness'))
    return { color: colors.magenta, tone: 'magenta', icon: 'heart-outline' };
  if (key.includes('energy')) return { color: colors.cyan, tone: 'cyan', icon: 'flash-outline' };
  return { color: colors.solanaGreen, tone: 'green', icon: 'water-outline' };
};

/** A single pet vital with icon, live (animated) value, meter and low-state warning. */
export function StatCard({
  label,
  value,
  focus = false,
}: {
  label: string;
  value: number;
  /** Marks this vital as the one most needing attention. */
  focus?: boolean;
}) {
  const c = config(label);
  const low = value < 30;
  return (
    <GlassPanel
      padded={false}
      style={[
        styles.card,
        focus && { borderColor: `${c.color}80`, backgroundColor: `${c.color}12` },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[styles.icon, { borderColor: `${c.color}55`, backgroundColor: `${c.color}18` }]}
        >
          <Ionicons color={c.color} name={c.icon} size={17} />
        </View>
        <AnimatedCount value={value} variant="stat" tone={low ? 'amber' : 'text'} />
      </View>
      <Text variant="micro" tone="muted">
        {label}
      </Text>
      <ProgressBar height={7} max={100} tone={low ? 'amber' : c.tone} value={value} />
      {low ? (
        <View style={styles.lowRow}>
          <View style={styles.lowDot} />
          <Text variant="caption" tone="amber">
            Needs care
          </Text>
        </View>
      ) : null}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.xs,
    minWidth: '45%',
    padding: spacing.md,
  },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  icon: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  lowRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 2 },
  lowDot: { backgroundColor: colors.amber, borderRadius: 999, height: 6, width: 6 },
});
