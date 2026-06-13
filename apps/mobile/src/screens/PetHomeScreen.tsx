import { CareActionType } from '@pawket/shared';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PetAvatar } from '../components/PetAvatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { usePetState } from '../hooks/usePetState';
import { colors } from '../theme/tokens';
export function PetHomeScreen() {
  const { pet, mood, care } = usePetState();
  return (
    <Screen>
      <Text style={styles.title}>{pet.name}</Text>
      <Text style={styles.sub}>Level {pet.level} • Pet Passport evolving</Text>
      <PetAvatar mood={mood} />
      <View style={styles.grid}>
        <StatCard label="Hunger" value={pet.hunger} />
        <StatCard label="Fun" value={pet.happiness} />
        <StatCard label="Energy" value={pet.energy} />
        <StatCard label="Hygiene" value={pet.hygiene} />
      </View>
      <Text style={styles.section}>Care actions</Text>
      <View style={styles.actions}>
        <PrimaryButton label="Feed" onPress={() => care(CareActionType.Feed)} />
        <PrimaryButton label="Play" onPress={() => care(CareActionType.Play)} tone="mint" />
        <PrimaryButton label="Groom" onPress={() => care(CareActionType.Groom)} />
        <PrimaryButton label="Rest" onPress={() => care(CareActionType.Rest)} tone="mint" />
      </View>
      <View style={styles.nav}>
        <Link href="/passport" style={styles.link}>
          Pet Passport
        </Link>
        <Link href="/store" style={styles.link}>
          Store
        </Link>
        <Link href="/friends" style={styles.link}>
          Visit friends
        </Link>
        <Link href="/events" style={styles.link}>
          Season One
        </Link>
        <Link href="/settings" style={styles.link}>
          Settings
        </Link>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 40, fontWeight: '900' },
  sub: { color: colors.amber, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  section: { color: colors.text, fontSize: 20, fontWeight: '900' },
  actions: { gap: 10 },
  nav: { gap: 10, backgroundColor: colors.card, borderRadius: 18, padding: 16 },
  link: { color: colors.mint, fontWeight: '800', fontSize: 16 },
});
