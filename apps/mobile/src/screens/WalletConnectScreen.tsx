import { StyleSheet, Text } from 'react-native';
import { MessageBanner } from '../components/MessageBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { colors } from '../theme/tokens';

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
});
