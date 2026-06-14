import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, GlassPanel } from '../components/DesignSystem';
import { BrandMark } from '../components/BrandMark';
import { FadeInUp } from '../components/Motion';
import { PetChamber } from '../components/PetChamber';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { colors, spacing } from '../theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

const features: { icon: IconName; title: string; copy: string; color: string }[] = [
  { icon: 'sparkles', title: 'Adopt', copy: 'Claim a companion', color: colors.solanaPurple },
  { icon: 'heart', title: 'Care', copy: 'Daily rituals', color: colors.magenta },
  { icon: 'trending-up', title: 'Evolve', copy: 'Build its story', color: colors.solanaGreen },
];

export function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <Screen>
      <FadeInUp>
        <BrandMark pill="Devnet" />
      </FadeInUp>

      <FadeInUp delay={60}>
        <View style={styles.hero}>
          <Text variant="eyebrow" tone="green">
            Living companion protocol
          </Text>
          <Text variant="display" tone="text" style={styles.title}>
            A living on-chain companion.
          </Text>
          <Text variant="bodyLg" tone="soft">
            Adopt a digital pet, build its Pet Passport, and turn every care ritual into part of its
            story.
          </Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={120}>
        <PetChamber mood="Waking up" />
      </FadeInUp>

      <FadeInUp delay={180}>
        <View style={styles.featureRow}>
          {features.map((f) => (
            <GlassPanel key={f.title} padded={false} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: `${f.color}1c` }]}>
                <Ionicons color={f.color} name={f.icon} size={18} />
              </View>
              <Text variant="label" tone="text">
                {f.title}
              </Text>
              <Text variant="caption" tone="muted">
                {f.copy}
              </Text>
            </GlassPanel>
          ))}
        </View>
      </FadeInUp>

      <FadeInUp delay={240}>
        <View style={styles.cta}>
          <Button
            icon="sparkles"
            label="Wake your companion"
            onPress={onStart}
            trailingIcon="arrow-forward"
          />
          <Text variant="caption" tone="faint" align="center" style={styles.footer}>
            CARE TODAY · EVOLVE FOREVER
          </Text>
        </View>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, paddingTop: spacing.sm },
  title: { marginTop: 2 },
  featureRow: { flexDirection: 'row', gap: spacing.sm },
  featureCard: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 6,
    padding: spacing.md,
  },
  featureIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    marginBottom: 2,
    width: 36,
  },
  cta: { gap: spacing.sm },
  footer: { letterSpacing: 2, marginTop: 2 },
});
