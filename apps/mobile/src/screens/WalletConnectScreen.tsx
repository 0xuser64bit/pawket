import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Divider,
  GlassPanel,
  IconTile,
  Pill,
  SectionHeader,
} from '../components/DesignSystem';
import { FadeInUp } from '../components/Motion';
import { MessageBanner } from '../components/MessageBanner';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { tapMedium } from '../feedback/haptics';
import { solanaConfig } from '../solana/config';
import { colors, spacing } from '../theme/tokens';

function shorten(value: string) {
  if (value.length <= 26) return value;
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

const trust = [
  'A real key is generated and stored on this device.',
  'No seed phrase, no sign-up, no email — just your companion.',
  'This device is your identity: your pet and Passport are yours.',
];

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readRow}>
      <Text variant="micro" tone="cyan">
        {label}
      </Text>
      <Text variant="mono" tone="text" selectable>
        {shorten(value)}
      </Text>
    </View>
  );
}

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
        <Pill tone="green" icon="shield-checkmark">
          On-device key
        </Pill>
        <Text variant="title" tone="text" style={styles.title}>
          Create your companion key.
        </Text>
        <Text variant="bodyLg" tone="soft">
          Pawket mints a private key on this device — that's your wallet and your identity. One tap,
          no accounts.
        </Text>
      </FadeInUp>

      <FadeInUp delay={80}>
        <GlassPanel glow="green" style={styles.hero}>
          <IconTile icon="shield-checkmark-outline" tone="green" size={64} glow />
          <Text variant="h2" tone="text" align="center">
            Your key, your companion.
          </Text>
          <View style={styles.trustList}>
            {trust.map((line) => (
              <View key={line} style={styles.trustRow}>
                <Ionicons color={colors.solanaGreen} name="checkmark-circle" size={18} />
                <Text variant="body" tone="soft" style={styles.flex}>
                  {line}
                </Text>
              </View>
            ))}
          </View>
        </GlassPanel>
      </FadeInUp>

      <MessageBanner tone="error" message={error} />

      <FadeInUp delay={140}>
        <Button
          icon="sparkles"
          label={loading ? 'Creating your key…' : 'Create my companion key'}
          onPress={() => {
            tapMedium();
            onConnected();
          }}
          tone="green"
          loading={loading}
        />
      </FadeInUp>

      <FadeInUp delay={200}>
        <GlassPanel style={styles.readiness}>
          <SectionHeader eyebrow="network" title="Running on devnet" tone="cyan" />
          <ReadinessRow label="Program" value={solanaConfig.programId} />
          <Divider />
          <ReadinessRow label="Cluster" value={solanaConfig.cluster} />
          <Divider />
          <ReadinessRow label="RPC" value={solanaConfig.rpcUrl} />
          <Text variant="caption" tone="muted" style={styles.note}>
            Pawket runs on Solana devnet — your companion is free to raise while the game grows.
          </Text>
        </GlassPanel>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md, marginBottom: 6 },
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  trustList: { alignSelf: 'stretch', gap: spacing.sm },
  trustRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  readiness: { gap: spacing.sm },
  readRow: { gap: 5, paddingVertical: spacing.xs },
  note: { marginTop: spacing.xs },
});
