import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { FadeInUp } from './Motion';
import { Text } from './Text';
import { colors, radius, spacing } from '../theme/tokens';

const config = {
  error: {
    color: colors.danger,
    fill: colors.dangerMuted,
    line: colors.dangerLine,
    icon: 'alert-circle-outline' as const,
  },
  success: {
    color: colors.success,
    fill: colors.successMuted,
    line: colors.successLine,
    icon: 'checkmark-circle-outline' as const,
  },
} as const;

/** Inline feedback banner used for transient notices and recoverable errors. */
export function MessageBanner({
  message,
  tone,
}: {
  message: string | null;
  tone: 'error' | 'success';
}) {
  if (!message) return null;
  const c = config[tone];
  return (
    <FadeInUp distance={8}>
      <View
        accessibilityRole="alert"
        style={[styles.banner, { borderColor: c.line, backgroundColor: c.fill }]}
      >
        <Ionicons color={c.color} name={c.icon} size={18} />
        <Text variant="label" tone="soft" style={styles.text}>
          {message}
        </Text>
      </View>
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: { flex: 1 },
});
