import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { PawketSessionProvider } from '../src/state/PawketSessionContext';

export default function Layout() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.style.backgroundColor = '#080712';
    document.documentElement.style.minHeight = '100vh';
    document.body.style.backgroundColor = '#080712';
    document.body.style.minHeight = '100vh';
  }, []);

  return (
    <PawketSessionProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#080712' } }} />
    </PawketSessionProvider>
  );
}
