import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Surface } from '../src/components/DesignSystem';
import { FadeInUp } from '../src/components/Motion';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { colors, spacing } from '../src/theme/tokens';

const drops = [
  {
    title: 'Seasonal quests',
    copy: 'Short daily and weekly rituals, with memories that only exist this season.',
  },
  {
    title: 'Looks and eggs',
    copy: 'Habitat skins and rare variants. Paid in SOL or USDC if they ship. Nothing is sold yet.',
  },
  {
    title: 'Visits',
    copy: 'Drop in on a friend’s habitat and leave a care boost. Social is not live.',
  },
];

export default function SeasonsScreen() {
  const { pet, dailyGoals } = usePawketSession();
  const streak = dailyGoals?.currentStreakDays ?? 0;

  return (
    <Screen nav>
      <FadeInUp>
        <Text variant="title" tone="text">
          Season One is still forming.
        </Text>
        <Text variant="bodyLg" tone="muted" style={styles.lead}>
          {pet
            ? `${pet.name}'s daily care is already building the streak this season will reward.`
            : 'Adopt a companion and daily care starts counting toward Season One.'}
        </Text>
      </FadeInUp>

      <FadeInUp delay={60}>
        <Surface>
          <Text variant="h3" tone="text">
            Care now, claim later
          </Text>
          <Text variant="caption" tone="muted" style={styles.streak}>
            {streak > 0
              ? `Current streak: ${streak} days`
              : 'Your streak will carry into the season. Neglect lets it fade.'}
          </Text>
        </Surface>
      </FadeInUp>

      <View style={styles.list}>
        {drops.map((drop, i) => (
          <FadeInUp key={drop.title} delay={100 + i * 50}>
            <View style={styles.item}>
              <Text variant="h3" tone="text">
                {drop.title}
              </Text>
              <Text variant="body" tone="muted">
                {drop.copy}
              </Text>
            </View>
          </FadeInUp>
        ))}
      </View>

      <FadeInUp delay={280}>
        <Button
          label="Back to your companion"
          onPress={() => router.push('/home')}
          tone="ghost"
        />
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm },
  streak: { marginTop: spacing.xs },
  list: { gap: 0 },
  item: {
    borderColor: colors.border,
    borderTopWidth: 1,
    gap: 6,
    paddingVertical: spacing.md,
  },
});
