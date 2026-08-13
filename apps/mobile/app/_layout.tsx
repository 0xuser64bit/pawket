import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { PawketSessionProvider } from '../src/state/PawketSessionContext';
import { colors } from '../src/theme/tokens';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const id = 'pawket-root-lock';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent =
      'html,body,#root{width:100%!important;max-width:100%!important;overflow-x:hidden;}';
    document.head.appendChild(style);
  }
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.style.backgroundColor = colors.bg;
    document.documentElement.style.minHeight = '100vh';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.width = '100%';
    document.body.style.backgroundColor = colors.bg;
    document.body.style.minHeight = '100vh';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.width = '100%';
    const root = document.getElementById('root');
    if (root) {
      root.style.width = '100%';
      root.style.maxWidth = '100%';
      root.style.overflow = 'hidden';
    }
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <PawketSessionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </PawketSessionProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: 'center',
  },
});
