import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/tokens';

export function PrimaryButton({
  label,
  onPress,
  tone = 'pink',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'pink' | 'mint' | 'violet';
  disabled?: boolean;
}) {
  const backgroundColor =
    tone === 'pink' ? colors.pink : tone === 'mint' ? colors.mint : colors.violet;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor }, disabled && styles.disabled]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { borderRadius: 999, paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center' },
  disabled: { opacity: 0.55 },
  text: { color: '#120b18', fontWeight: '800', fontSize: 16 },
});
