import { router } from 'expo-router';
import { LandingScreen } from '../src/screens/LandingScreen';
export default function Index() {
  return <LandingScreen onStart={() => router.push('/wallet')} />;
}
