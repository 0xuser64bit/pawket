import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PawketSessionProvider } from '../src/state/PawketSessionContext';

export default function Layout() {
  return (
    <PawketSessionProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#080712' } }} />
    </PawketSessionProvider>
  );
}
