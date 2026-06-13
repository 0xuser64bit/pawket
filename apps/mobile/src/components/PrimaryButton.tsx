import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/tokens';
export function PrimaryButton({
  label,
  onPress,
  tone = 'pink',
}: {
  label: string;
  onPress: () => void;
  tone?: 'pink' | 'mint';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: tone === 'pink' ? colors.pink : colors.mint }]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { borderRadius: 999, paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center' },
  text: { color: '#120b18', fontWeight: '800', fontSize: 16 },
});
