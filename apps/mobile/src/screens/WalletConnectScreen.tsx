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
import { solanaConfig } from '../solana/config';
import { colors, spacing } from '../theme/tokens';

function shorten(value: string) {
  if (value.length <= 26) return value;
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

const trust = [
  'Pawket never asks for a seed phrase.',
  'You own your companion and its passport.',
  'Dev mode is isolated from mainnet — no production claims.',
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
          Secure dev path
        </Pill>
        <Text variant="title" tone="text" style={styles.title}>
          Connect your keeper key.
        </Text>
        <Text variant="bodyLg" tone="soft">
          Use the clearly named dev wallet for this build. Device releases will sign through the
          Solana Mobile Wallet Adapter.
        </Text>
      </FadeInUp>

      <FadeInUp delay={80}>
        <GlassPanel glow="green" style={styles.hero}>
          <IconTile icon="shield-checkmark-outline" tone="green" size={64} glow />
          <Text variant="h2" tone="text" align="center">
            Your dev wallet anchors this session.
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
          icon="wallet"
          label={loading ? 'Opening dev wallet…' : 'Continue with dev wallet'}
          onPress={onConnected}
          tone="green"
          loading={loading}
        />
      </FadeInUp>

      <FadeInUp delay={200}>
        <GlassPanel style={styles.readiness}>
          <SectionHeader eyebrow="network" title="Devnet readiness" tone="cyan" />
          <ReadinessRow label="Program" value={solanaConfig.programId} />
          <Divider />
          <ReadinessRow label="Cluster" value={solanaConfig.cluster} />
          <Divider />
          <ReadinessRow label="RPC" value={solanaConfig.rpcUrl} />
          <Text variant="caption" tone="muted" style={styles.note}>
            SDK builders emit unsigned, Anchor-compatible instructions. Signing remains explicit
            dev/demo infrastructure.
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
