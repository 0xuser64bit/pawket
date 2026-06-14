import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { FadeInUp } from './Motion';
import { Text } from './Text';
import { colors, radius, spacing } from '../theme/tokens';

const config = {
  error: { color: colors.danger, icon: 'alert-circle-outline' as const, label: 'Heads up' },
  success: { color: colors.solanaGreen, icon: 'checkmark-circle-outline' as const, label: 'Done' },
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
        style={[styles.banner, { borderColor: `${c.color}55`, backgroundColor: `${c.color}14` }]}
      >
        <View style={[styles.icon, { backgroundColor: `${c.color}24` }]}>
          <Ionicons color={c.color} name={c.icon} size={16} />
        </View>
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
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  text: { flex: 1 },
});
