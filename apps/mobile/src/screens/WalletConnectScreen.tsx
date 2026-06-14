import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button, GlassPanel, Pill, SectionHeader } from '../components/DesignSystem';
import { MessageBanner } from '../components/MessageBanner';
import { Screen } from '../components/Screen';
import { solanaConfig } from '../solana/config';
import { colors, spacing, typography } from '../theme/tokens';

function shorten(value: string) {
  if (value.length <= 26) return value;
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readinessRow}>
      <Text style={styles.readinessLabel}>{label}</Text>
      <Text selectable style={styles.readinessValue}>
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
      <Pill tone="green">Secure dev path</Pill>
      <Text style={styles.title}>Connect your keeper key.</Text>
      <Text style={styles.copy}>
        Use the clearly named dev wallet for this demo. Real device builds will connect through
        Solana Mobile Wallet Adapter.
      </Text>

      <GlassPanel glow style={styles.securityCard}>
        <View style={styles.securityIcon}>
          <Ionicons color={colors.solanaGreen} name="shield-checkmark-outline" size={30} />
        </View>
        <Text style={styles.cardTitle}>Your dev wallet anchors this companion session.</Text>
        <Text style={styles.cardCopy}>
          Pawket never asks for a seed phrase. Dev mode stores local/API pet state and does not
          claim production mainnet ownership.
        </Text>
      </GlassPanel>

      <GlassPanel style={styles.readinessPanel}>
        <SectionHeader eyebrow="network" title="Devnet readiness" />
        <ReadinessRow label="Program" value={solanaConfig.programId} />
        <ReadinessRow label="Cluster" value={solanaConfig.cluster} />
        <ReadinessRow label="RPC" value={solanaConfig.rpcUrl} />
        <Text style={styles.readinessCopy}>
          SDK builders are available for unsigned Anchor-compatible instructions. Signing is still
          explicit dev/demo infrastructure.
        </Text>
      </GlassPanel>
      <MessageBanner tone="error" message={error} />
      <Button
        icon="wallet-outline"
        label={loading ? 'Opening dev wallet…' : 'Continue with dev wallet'}
        onPress={onConnected}
        tone="green"
        disabled={loading}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textSoft, fontSize: 17 },
  securityCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  securityIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(20,241,149,0.12)',
    borderColor: 'rgba(20,241,149,0.35)',
    borderRadius: 28,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  cardTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  cardCopy: { ...typography.body, color: colors.muted, textAlign: 'center' },
  readinessPanel: { gap: spacing.md },
  readinessRow: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
    padding: spacing.md,
  },
  readinessLabel: { ...typography.micro, color: colors.cyan, textTransform: 'uppercase' },
  readinessValue: { color: colors.text, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  readinessCopy: { color: colors.muted, lineHeight: 21 },
});
