import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LandingScreen } from '../src/screens/LandingScreen';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { colors } from '../src/theme/tokens';

export default function Index() {
  const { wallet, pet, hydrated } = usePawketSession();

  useEffect(() => {
    if (!hydrated) return;
    if (wallet && pet) router.replace('/home');
    else if (wallet && !pet) router.replace('/adopt');
  }, [hydrated, pet, wallet]);

  // Hold the landing flow until launch-time session restore resolves, so a
  // returning player is taken straight to their pet without a landing flash.
  if (!hydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.solanaGreen} />
      </View>
    );
  }

  return <LandingScreen onStart={() => router.push(wallet ? '/adopt' : '/wallet')} />;
}

const styles = StyleSheet.create({
  boot: { alignItems: 'center', backgroundColor: colors.bg, flex: 1, justifyContent: 'center' },
});
