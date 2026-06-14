import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export function MessageBanner({
  message,
  tone,
}: {
  message: string | null;
  tone: 'error' | 'success';
}) {
  if (!message) return null;
  const color = tone === 'error' ? colors.danger : colors.solanaGreen;
  return (
    <View style={[styles.banner, { borderColor: `${color}66`, backgroundColor: `${color}12` }]}>
      <Ionicons
        color={color}
        name={tone === 'error' ? 'warning-outline' : 'checkmark-circle-outline'}
        size={18}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  text: { color: colors.textSoft, flex: 1, fontWeight: '700', lineHeight: 20 },
});
