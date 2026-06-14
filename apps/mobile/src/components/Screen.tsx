import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from './DesignSystem';
import { gradients } from '../theme/tokens';

export function Screen({ children, nav = false }: { children: ReactNode; nav?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.app} style={styles.root}>
      <View pointerEvents="none" style={styles.orbOne} />
      <View pointerEvents="none" style={styles.orbTwo} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(28, insets.top + 20),
            paddingBottom: nav ? 116 : Math.max(34, insets.bottom + 30),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {nav ? <BottomNav /> : null}
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 18, paddingHorizontal: 18 },
  orbOne: {
    backgroundColor: 'rgba(139,92,246,0.22)',
    borderRadius: 140,
    height: 280,
    position: 'absolute',
    right: -110,
    top: -90,
    width: 280,
  },
  orbTwo: {
    backgroundColor: 'rgba(20,241,149,0.12)',
    borderRadius: 130,
    bottom: 90,
    height: 260,
    left: -130,
    position: 'absolute',
    width: 260,
  },
});
