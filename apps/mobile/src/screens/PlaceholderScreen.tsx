import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { colors } from '../theme/tokens';
export function PlaceholderScreen({ title, copy }: { title: string; copy: string }) {
  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
      <Link href="/home" style={styles.link}>
        Back to companion
      </Link>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 38, fontWeight: '900' },
  copy: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 25,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
  },
  link: { color: colors.mint, fontWeight: '800', fontSize: 16 },
});
