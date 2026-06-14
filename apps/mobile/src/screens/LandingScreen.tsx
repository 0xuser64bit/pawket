import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button, GlassPanel, Pill } from '../components/DesignSystem';
import { PetAvatar } from '../components/PetAvatar';
import { Screen } from '../components/Screen';
import { colors, spacing, typography } from '../theme/tokens';

export function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.mark}>
          <Ionicons color={colors.solanaGreen} name="paw" size={22} />
        </View>
        <Text style={styles.brand}>Pawket</Text>
        <Pill tone="purple">Solana devnet</Pill>
      </View>

      <View style={styles.hero}>
        <Text style={styles.kicker}>Living companion protocol</Text>
        <Text style={styles.title}>A living Solana companion.</Text>
        <Text style={styles.copy}>
          Adopt a digital pet, build its Pet Passport, and turn every care ritual into part of its
          story.
        </Text>
      </View>

      <PetAvatar compact mood="Waking up" />

      <GlassPanel style={styles.promise}>
        <View style={styles.promiseRow}>
          <Ionicons color={colors.cyan} name="pulse-outline" size={20} />
          <Text style={styles.promiseTitle}>Care today. Evolve forever.</Text>
        </View>
        <Text style={styles.promiseCopy}>
          Pawket starts in a transparent dev wallet flow while the Solana Mobile signing path is
          wired.
        </Text>
      </GlassPanel>

      <Button icon="sparkles-outline" label="Wake your companion" onPress={onStart} />
      <Text style={styles.footer}>Pet Passport · Season One · Companion economy</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  mark: {
    alignItems: 'center',
    backgroundColor: 'rgba(20,241,149,0.12)',
    borderColor: 'rgba(20,241,149,0.35)',
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  brand: { color: colors.text, flex: 1, fontSize: 21, fontWeight: '900', letterSpacing: -0.3 },
  hero: { gap: spacing.sm, paddingTop: spacing.xl },
  kicker: { ...typography.micro, color: colors.solanaGreen, textTransform: 'uppercase' },
  title: { ...typography.title, color: colors.text, fontSize: 44, lineHeight: 47 },
  copy: { ...typography.body, color: colors.textSoft, fontSize: 17 },
  promise: { gap: spacing.sm },
  promiseRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  promiseTitle: { color: colors.text, flex: 1, fontSize: 18, fontWeight: '900' },
  promiseCopy: { ...typography.body, color: colors.muted },
  footer: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
