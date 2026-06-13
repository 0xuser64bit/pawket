import { StyleSheet, Text } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { colors } from '../theme/tokens';
export function WalletConnectScreen({ onConnected }: { onConnected: () => void }) {
  return (
    <Screen>
      <Text style={styles.title}>Connect on devnet</Text>
      <Text style={styles.copy}>
        Pawket will use Solana Mobile Wallet Adapter for real device signing. This starter flow uses
        a clearly marked dev session.
      </Text>
      <PrimaryButton label="Continue with dev wallet" onPress={onConnected} tone="mint" />
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 36, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 17, lineHeight: 25 },
});
