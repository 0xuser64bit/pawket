import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
export function Screen({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={['#080712', '#17122a', '#080712']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 22, paddingTop: 72, gap: 18 },
});
