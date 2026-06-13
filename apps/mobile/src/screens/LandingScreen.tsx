import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { colors } from '../theme/tokens';
export function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Pawket</Text>
        <Text style={styles.title}>Your companion is waiting.</Text>
        <Text style={styles.copy}>
          Care today, evolve forever. A living on-chain companion game for Solana Mobile.
        </Text>
      </View>
      <PrimaryButton label="Adopt your first Pawket" onPress={onStart} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: { gap: 14, marginTop: 60 },
  kicker: { color: colors.mint, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 48, lineHeight: 52, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 18, lineHeight: 27 },
});
