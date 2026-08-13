import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, GlassPanel, IconTile, Pill, SectionHeader } from '../src/components/DesignSystem';
import { FadeInUp } from '../src/components/Motion';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { spacing } from '../src/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ToneKey = 'green' | 'purple' | 'cyan' | 'amber';

const drops: { title: string; copy: string; icon: IconName; tone: ToneKey; tag: string }[] = [
  {
    title: 'Seasonal quests',
    copy: 'Daily and weekly rituals tuned for short mobile sessions, with limited memories that only exist this season.',
    icon: 'flash',
    tone: 'amber',
    tag: 'Season One',
  },
  {
    title: 'Cosmetics & eggs',
    copy: 'Aura trails, habitat skins and rare companion variants — paid for in SOL or USDC, never with hidden mechanics.',
    icon: 'sparkles',
    tone: 'purple',
    tag: 'Store',
  },
  {
    title: 'Visits & gifting',
    copy: 'Drop in on a friend’s habitat, leave a care boost, and show off your Passport badges.',
    icon: 'people',
    tone: 'cyan',
    tag: 'Social',
  },
];

export default function SeasonsScreen() {
  const { pet, dailyGoals } = usePawketSession();
  const streak = dailyGoals?.currentStreakDays ?? 0;

  return (
    <Screen nav>
      <FadeInUp>
        <View style={styles.head}>
          <View style={styles.flex}>
            <Text variant="eyebrow" tone="amber">
              Season One
            </Text>
            <Text variant="title" tone="text">
              The first season is forming.
            </Text>
          </View>
          <Pill tone="amber" icon="flame">
            Soon
          </Pill>
        </View>
        <Text variant="bodyLg" tone="soft">
          {pet
            ? `${pet.name}'s daily care is already building the streak that Season One will reward.`
            : 'Adopt a companion and your daily care starts building toward Season One rewards.'}
        </Text>
      </FadeInUp>

      <FadeInUp delay={70}>
        <GlassPanel glow="amber" style={styles.banner}>
          <IconTile icon="flame" tone="amber" size={56} glow />
          <View style={styles.flex}>
            <Text variant="h3" tone="text">
              Care today, claim later
            </Text>
            <Text variant="caption" tone="muted">
              {streak > 0
                ? `Current streak: ${streak} days`
                : 'Your streak carries into the season — neglect lets it fade.'}
            </Text>
          </View>
        </GlassPanel>
      </FadeInUp>

      <FadeInUp delay={120}>
        <SectionHeader eyebrow="what's coming" title="In the season" tone="amber" />
      </FadeInUp>

      <View style={styles.grid}>
        {drops.map((drop, i) => (
          <FadeInUp key={drop.title} delay={150 + i * 60}>
            <GlassPanel style={styles.card}>
              <IconTile icon={drop.icon} tone={drop.tone} />
              <View style={styles.cardBody}>
                <View style={styles.cardTitle}>
                  <Text variant="h3" tone="text">
                    {drop.title}
                  </Text>
                  <Pill tone={drop.tone}>{drop.tag}</Pill>
                </View>
                <Text variant="body" tone="muted">
                  {drop.copy}
                </Text>
              </View>
            </GlassPanel>
          </FadeInUp>
        ))}
      </View>

      <FadeInUp delay={340}>
        <Button
          label="Back to your companion"
          onPress={() => router.push('/home')}
          tone="ghost"
          trailingIcon="arrow-forward"
        />
        <Text variant="caption" tone="faint" align="center" style={styles.footer}>
          PAWKET · SEASON ONE
        </Text>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  banner: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  grid: { gap: spacing.sm },
  card: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  cardBody: { flex: 1, gap: 6 },
  cardTitle: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  footer: { letterSpacing: 2, marginTop: spacing.sm },
});
