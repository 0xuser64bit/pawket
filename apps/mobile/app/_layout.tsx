import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { PawketSessionProvider } from '../src/state/PawketSessionContext';
import { colors } from '../src/theme/tokens';

export default function Layout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.style.backgroundColor = colors.bg;
    document.documentElement.style.minHeight = '100vh';
    document.body.style.backgroundColor = colors.bg;
    document.body.style.minHeight = '100vh';
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <View style={styles.bootGlow} />
        <ActivityIndicator color={colors.solanaGreen} />
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
  bootGlow: {
    backgroundColor: 'rgba(23,229,137,0.16)',
    borderRadius: 120,
    height: 240,
    position: 'absolute',
    width: 240,
  },
});
