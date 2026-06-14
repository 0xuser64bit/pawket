import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, GlassPanel, IconTile, Pill, SectionHeader } from '../components/DesignSystem';
import { FadeInUp } from '../components/Motion';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { spacing } from '../theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ToneKey = 'green' | 'purple' | 'cyan' | 'amber';

type Preview = {
  title: string;
  copy: string;
  icon: IconName;
  tone: ToneKey;
};

export function PlaceholderScreen({
  title,
  eyebrow,
  copy,
  icon,
  tone = 'purple',
  previews,
}: {
  title: string;
  eyebrow: string;
  copy: string;
  icon: IconName;
  tone?: ToneKey;
  previews: Preview[];
}) {
  return (
    <Screen nav>
      <FadeInUp>
        <Pill tone={tone} icon="time-outline">
          Coming soon
        </Pill>
        <View style={styles.hero}>
          <IconTile icon={icon} tone={tone} size={84} glow />
          <Text variant="eyebrow" tone={tone} align="center" style={styles.eyebrow}>
            {eyebrow}
          </Text>
          <Text variant="title" tone="text" align="center">
            {title}
          </Text>
          <Text variant="bodyLg" tone="soft" align="center">
            {copy}
          </Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={80}>
        <SectionHeader eyebrow="preview" title="What unlocks next" tone={tone} />
      </FadeInUp>

      <View style={styles.grid}>
        {previews.map((preview, i) => (
          <FadeInUp key={preview.title} delay={120 + i * 60}>
            <GlassPanel style={styles.card}>
              <IconTile icon={preview.icon} tone={preview.tone} />
              <View style={styles.cardBody}>
                <Text variant="h3" tone="text">
                  {preview.title}
                </Text>
                <Text variant="body" tone="muted">
                  {preview.copy}
                </Text>
              </View>
            </GlassPanel>
          </FadeInUp>
        ))}
      </View>

      <FadeInUp delay={320}>
        <Button
          label="Return to companion"
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
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  eyebrow: { marginTop: spacing.xs },
  grid: { gap: spacing.sm },
  card: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  cardBody: { flex: 1, gap: 3 },
  footer: { letterSpacing: 2, marginTop: spacing.sm },
});
