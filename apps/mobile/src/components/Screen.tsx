import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from './DesignSystem';
import { gradients, layout, spacing } from '../theme/tokens';

export function Screen({
  children,
  nav = false,
  contentStyle,
}: {
  children: ReactNode;
  nav?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.app} style={styles.root}>
      {/* Cinematic ambient orbs */}
      <View pointerEvents="none" style={styles.orbPurple} />
      <View pointerEvents="none" style={styles.orbGreen} />
      <View pointerEvents="none" style={styles.orbCyan} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(26, insets.top + 16),
            paddingBottom: nav ? insets.bottom + 110 : Math.max(34, insets.bottom + 28),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, contentStyle]}>{children}</View>
      </ScrollView>

      {nav ? <BottomNav /> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: layout.screenPadding },
  content: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: layout.maxContent,
    width: '100%',
  },
  orbPurple: {
    backgroundColor: 'rgba(155,107,255,0.20)',
    borderRadius: 200,
    height: 320,
    position: 'absolute',
    right: -130,
    top: -110,
    width: 320,
  },
  orbGreen: {
    backgroundColor: 'rgba(23,229,137,0.12)',
    borderRadius: 180,
    bottom: 60,
    height: 300,
    left: -140,
    position: 'absolute',
    width: 300,
  },
  orbCyan: {
    backgroundColor: 'rgba(43,212,245,0.10)',
    borderRadius: 150,
    height: 240,
    position: 'absolute',
    right: -90,
    top: '42%',
    width: 240,
  },
});
