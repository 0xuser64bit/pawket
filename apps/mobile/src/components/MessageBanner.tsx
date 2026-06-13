import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

export function MessageBanner({
  message,
  tone,
}: {
  message: string | null;
  tone: 'error' | 'success';
}) {
  if (!message) return null;
  return (
    <View style={[styles.banner, tone === 'error' ? styles.error : styles.success]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 18, padding: 14, borderWidth: 1 },
  error: { backgroundColor: '#2a121b', borderColor: colors.danger },
  success: { backgroundColor: '#10251f', borderColor: colors.mint },
  text: { color: colors.text, fontWeight: '700', lineHeight: 20 },
});
