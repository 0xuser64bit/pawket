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
  overlay,
}: {
  children: ReactNode;
  nav?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Rendered above the scroll view + nav, covering the full viewport. */
  overlay?: ReactNode;
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
      {overlay}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Clip the ambient orbs to the viewport so they can't expand content width
  // (which made large headings wrap to the wrong width / clip on web).
  root: { flex: 1, overflow: 'hidden' },
  scroll: {},
  // Horizontal padding lives on the content view (not the scroll container) so
  // `width: 100%` can't compute wider than the viewport and clip headings on web.
  content: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: layout.maxContent,
    paddingHorizontal: layout.screenPadding,
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
