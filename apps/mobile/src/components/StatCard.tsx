import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderColor: '#2d2645',
    borderWidth: 1,
  },
  value: { color: colors.text, fontSize: 24, fontWeight: '900' },
  label: { color: colors.muted, marginTop: 4 },
});
