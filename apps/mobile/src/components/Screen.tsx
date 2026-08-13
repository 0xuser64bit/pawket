import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from './DesignSystem';
import { colors, gradients, layout, spacing } from '../theme/tokens';

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
      <View pointerEvents="none" style={styles.lampWrap}>
        <View style={styles.lamp} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(24, insets.top + 12),
            paddingBottom: nav ? insets.bottom + 104 : Math.max(32, insets.bottom + 24),
            paddingHorizontal: layout.screenPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
      >
        <View style={[styles.content, contentStyle]}>{children}</View>
      </ScrollView>

      {nav ? <BottomNav /> : null}
      {overlay}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.bg,
    flex: 1,
    maxWidth: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  scrollView: { flex: 1, maxWidth: '100%', width: '100%' },
  scroll: { flexGrow: 1, maxWidth: '100%' },
  content: {
    alignSelf: 'center',
    gap: spacing.lg,
    maxWidth: layout.maxContent,
    width: '100%',
  },
  lampWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  lamp: {
    backgroundColor: colors.lamp,
    borderRadius: 160,
    height: 280,
    top: -90,
    width: 280,
  },
});
