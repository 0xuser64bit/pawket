import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/DesignSystem';
import { FadeInUp } from '../components/Motion';
import { MessageBanner } from '../components/MessageBanner';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { tapMedium } from '../feedback/haptics';
import { colors, spacing } from '../theme/tokens';

const trust = [
  'A key is created and stored on this device.',
  'No seed phrase, no email, no account.',
  'Your pet and passport belong to this key.',
];

export function WalletConnectScreen({
  error,
  loading,
  onConnected,
}: {
  error: string | null;
  loading: boolean;
  onConnected: () => void;
}) {
  return (
    <Screen>
      <FadeInUp>
        <Text variant="title" tone="text">
          Your key stays on this phone.
        </Text>
        <Text variant="bodyLg" tone="muted" style={styles.lead}>
          Pawket makes a companion key on this device. One tap. That key is your identity.
        </Text>
      </FadeInUp>

      <FadeInUp delay={70}>
        <View style={styles.trustList}>
          {trust.map((line) => (
            <View key={line} style={styles.trustRow}>
              <Ionicons color={colors.success} name="checkmark" size={18} />
              <Text variant="body" tone="soft" style={styles.flex}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      </FadeInUp>

      <MessageBanner tone="error" message={error} />

      <FadeInUp delay={120}>
        <Button
          icon="key-outline"
          label={loading ? 'Creating your key…' : 'Create companion key'}
          onPress={() => {
            tapMedium();
            onConnected();
          }}
          loading={loading}
        />
        <Text variant="caption" tone="faint" align="center" style={styles.note}>
          Free on Solana devnet while the game grows. Network details live in Settings.
        </Text>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: spacing.sm },
  trustList: { gap: spacing.md },
  trustRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  note: { marginTop: spacing.sm },
});
