import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassPanel, Pill, SectionHeader } from '../components/DesignSystem';
import { Screen } from '../components/Screen';
import { colors, radius, spacing, typography } from '../theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Preview = {
  title: string;
  copy: string;
  icon: IconName;
  tone: 'green' | 'purple' | 'cyan' | 'amber';
};

export function PlaceholderScreen({
  title,
  eyebrow,
  copy,
  icon,
  previews,
}: {
  title: string;
  eyebrow: string;
  copy: string;
  icon: IconName;
  previews: Preview[];
}) {
  return (
    <Screen nav>
      <Pill tone="purple">Coming soon</Pill>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons color={colors.solanaGreen} name={icon} size={34} />
        </View>
        <Text style={styles.kicker}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{copy}</Text>
      </View>

      <SectionHeader eyebrow="preview" title="What unlocks next" />
      <View style={styles.grid}>
        {previews.map((preview) => {
          const color =
            preview.tone === 'green'
              ? colors.solanaGreen
              : preview.tone === 'cyan'
                ? colors.cyan
                : preview.tone === 'amber'
                  ? colors.amber
                  : colors.solanaPurple;
          return (
            <GlassPanel key={preview.title} style={styles.card}>
              <View
                style={[
                  styles.cardIcon,
                  { borderColor: `${color}55`, backgroundColor: `${color}12` },
                ]}
              >
                <Ionicons color={color} name={preview.icon} size={22} />
              </View>
              <Text style={styles.cardTitle}>{preview.title}</Text>
              <Text style={styles.cardCopy}>{preview.copy}</Text>
            </GlassPanel>
          );
        })}
      </View>

      <Link href="/home" asChild>
        <Pressable style={styles.homeButton}>
          <Text style={styles.homeButtonText}>Return to companion</Text>
          <Ionicons color={colors.black} name="arrow-forward" size={15} />
        </Pressable>
      </Link>
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(20,241,149,0.12)',
    borderColor: 'rgba(20,241,149,0.35)',
    borderRadius: 38,
    borderWidth: 1,
    height: 82,
    justifyContent: 'center',
    width: 82,
  },
  kicker: {
    ...typography.micro,
    color: colors.solanaGreen,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  copy: { ...typography.body, color: colors.textSoft, textAlign: 'center' },
  grid: { gap: spacing.sm },
  card: { gap: spacing.sm },
  cardIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  cardCopy: { color: colors.muted, lineHeight: 20 },
  homeButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.solanaGreen,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    padding: spacing.md,
  },
  homeButtonText: { color: colors.black, fontSize: 16, fontWeight: '900' },
});
