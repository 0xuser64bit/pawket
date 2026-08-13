import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme/tokens';
import { AnimatedCount } from './AnimatedCount';
import { ProgressBar } from './DesignSystem';
import { Text } from './Text';

/** A single vital as a quiet meter row. Not a card. */
export function StatCard({
  label,
  value,
  focus = false,
}: {
  label: string;
  value: number;
  focus?: boolean;
}) {
  const low = value < 30;
  const tone = low ? 'warning' : focus ? 'accent' : 'success';
  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${label} ${value} percent${low ? ', needs care' : ''}`}
    >
      <View style={styles.head}>
        <Text variant="label" tone={focus || low ? 'text' : 'soft'}>
          {label}
        </Text>
        <AnimatedCount value={value} variant="label" tone={low ? 'warning' : 'text'} />
      </View>
      <ProgressBar height={6} max={100} tone={tone} value={value} />
      {low ? (
        <Text variant="caption" tone="warning">
          Needs care
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
  head: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
