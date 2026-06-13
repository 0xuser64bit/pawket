import { calculateXpForNextLevel, CareActionType } from '@pawket/shared';
import { Link } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MessageBanner } from '../components/MessageBanner';
import { PetAvatar } from '../components/PetAvatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { usePawketSession } from '../state/PawketSessionContext';
import { colors } from '../theme/tokens';

function label(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function PetHomeScreen() {
  const { careForPet, error, notice, pet, status } = usePawketSession();
  if (!pet) {
    return (
      <Screen>
        <ActivityIndicator color={colors.mint} />
        <Text style={styles.sub}>Loading your Pawket…</Text>
      </Screen>
    );
  }

  const nextLevelXp = calculateXpForNextLevel(pet.level);
  const currentLevelXp = calculateXpForNextLevel(pet.level - 1);
  const progress = Math.max(0, pet.xp - currentLevelXp);
  const needed = Math.max(1, nextLevelXp - currentLevelXp);
  const careDisabled = status === 'caring';

  return (
    <Screen>
      <Text style={styles.kicker}>Pet Home</Text>
      <Text style={styles.title}>{pet.name}</Text>
      <Text style={styles.sub}>
        {label(pet.species)} • {label(pet.personality)} • Level {pet.level}
      </Text>
      <PetAvatar mood={label(pet.mood)} species={pet.species} />
      <View style={styles.xpCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.section}>XP Progress</Text>
          <Text style={styles.xpText}>
            {progress}/{needed}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${Math.min(100, (progress / needed) * 100)}%` }]}
          />
        </View>
        <Text style={styles.lastCare}>
          {pet.lastCaredAt
            ? `Last care: ${label(pet.lastCareActionType ?? 'care')} at ${new Date(
                pet.lastCaredAt,
              ).toLocaleTimeString()}`
            : 'No care actions yet. Start with a feed, play, groom, or rest.'}
        </Text>
      </View>
      <View style={styles.grid}>
        <StatCard label="Hunger" value={pet.stats.hunger} />
        <StatCard label="Happiness" value={pet.stats.happiness} />
        <StatCard label="Energy" value={pet.stats.energy} />
        <StatCard label="Hygiene" value={pet.stats.hygiene} />
      </View>
      <MessageBanner tone="success" message={notice} />
      <MessageBanner tone="error" message={error} />
      <Text style={styles.section}>Care actions</Text>
      <View style={styles.actions}>
        <PrimaryButton
          label={careDisabled ? 'Caring…' : 'Feed'}
          onPress={() => careForPet(CareActionType.Feed)}
          disabled={careDisabled}
        />
        <PrimaryButton
          label="Play"
          onPress={() => careForPet(CareActionType.Play)}
          tone="mint"
          disabled={careDisabled}
        />
        <PrimaryButton
          label="Groom"
          onPress={() => careForPet(CareActionType.Groom)}
          tone="violet"
          disabled={careDisabled}
        />
        <PrimaryButton
          label="Rest"
          onPress={() => careForPet(CareActionType.Rest)}
          tone="mint"
          disabled={careDisabled}
        />
      </View>
      <View style={styles.nav}>
        <Link href="/passport" style={styles.link}>
          Pet Passport
        </Link>
        <Text style={styles.navMuted}>
          Store, friends, events, and cosmetics are intentionally out of scope.
        </Text>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  kicker: { color: colors.mint, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 40, fontWeight: '900' },
  sub: { color: colors.amber, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  section: { color: colors.text, fontSize: 20, fontWeight: '900' },
  actions: { gap: 10 },
  nav: { gap: 10, backgroundColor: colors.card, borderRadius: 18, padding: 16 },
  link: { color: colors.mint, fontWeight: '800', fontSize: 16 },
  navMuted: { color: colors.muted, lineHeight: 20 },
  xpCard: {
    backgroundColor: colors.card,
    borderColor: '#2d2645',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpText: { color: colors.mint, fontWeight: '900' },
  progressTrack: { backgroundColor: '#2d2645', borderRadius: 999, height: 10, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.mint, borderRadius: 999, height: 10 },
  lastCare: { color: colors.muted, lineHeight: 20 },
});
