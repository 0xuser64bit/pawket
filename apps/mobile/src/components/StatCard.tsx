import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassPanel, ProgressBar } from './DesignSystem';
import { colors, radius, spacing } from '../theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

const toneForLabel = (label: string) => {
  if (label.toLowerCase().includes('hunger'))
    return { color: colors.amber, tone: 'amber' as const, icon: 'nutrition-outline' as IconName };
  if (label.toLowerCase().includes('happiness'))
    return {
      color: colors.magenta,
      tone: 'magenta' as const,
      icon: 'sparkles-outline' as IconName,
    };
  if (label.toLowerCase().includes('energy'))
    return { color: colors.cyan, tone: 'cyan' as const, icon: 'flash-outline' as IconName };
  return { color: colors.solanaGreen, tone: 'green' as const, icon: 'water-outline' as IconName };
};

export function StatCard({ label, value }: { label: string; value: number }) {
  const tone = toneForLabel(label);
  return (
    <GlassPanel style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            { borderColor: `${tone.color}55`, backgroundColor: `${tone.color}12` },
          ]}
        >
          <Ionicons color={tone.color} name={tone.icon} size={18} />
        </View>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <ProgressBar height={7} max={100} tone={tone.tone} value={value} />
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
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  value: { color: colors.text, fontSize: 27, fontWeight: '900', letterSpacing: -0.5 },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
