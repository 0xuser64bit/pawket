import { StyleSheet, Text, View } from 'react-native';
import { MessageBanner } from '../components/MessageBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { solanaConfig } from '../solana/config';
import { colors } from '../theme/tokens';

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readinessRow}>
      <Text style={styles.readinessLabel}>{label}</Text>
      <Text selectable style={styles.readinessValue}>
        {value}
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
      <Text style={styles.kicker}>Local/dev mode</Text>
      <Text style={styles.title}>Connect on devnet</Text>
      <Text style={styles.copy}>
        Pawket will use Solana Mobile Wallet Adapter for real device signing. This vertical slice
        uses a clearly named dev wallet and persists pet state through the local API/database path.
      </Text>
      <View style={styles.readinessPanel}>
        <Text style={styles.readinessTitle}>Devnet readiness</Text>
        <ReadinessRow label="Program" value={solanaConfig.programId} />
        <ReadinessRow label="Cluster" value={solanaConfig.cluster} />
        <ReadinessRow label="RPC" value={solanaConfig.rpcUrl} />
        <Text style={styles.readinessCopy}>
          SDK transaction builders can now construct unsigned Anchor-compatible instructions. Mobile
          wallet signing is not connected yet.
        </Text>
      </View>
      <MessageBanner tone="error" message={error} />
      <PrimaryButton
        label={loading ? 'Connecting…' : 'Continue with dev wallet'}
        onPress={onConnected}
        tone="mint"
        disabled={loading}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  kicker: { color: colors.mint, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 36, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  readinessPanel: {
    backgroundColor: colors.card,
    borderColor: '#2d2645',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  readinessTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  readinessRow: { gap: 4 },
  readinessLabel: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  readinessValue: { color: colors.text, fontSize: 13, lineHeight: 18 },
  readinessCopy: { color: colors.muted, lineHeight: 20 },
});
