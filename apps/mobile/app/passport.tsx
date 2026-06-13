import { Link } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MessageBanner } from '../src/components/MessageBanner';
import { Screen } from '../src/components/Screen';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { colors } from '../src/theme/tokens';

function label(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function PassportScreen() {
  const { error, loadPassport, passportEvents, pet, status } = usePawketSession();

  useEffect(() => {
    void loadPassport();
  }, [loadPassport]);

  return (
    <Screen>
      <Text style={styles.kicker}>Pet Passport</Text>
      <Text style={styles.title}>{pet ? `${pet.name}'s timeline` : 'Timeline'}</Text>
      <Text style={styles.copy}>
        API-backed memories are real local/dev records. On-chain passport syncing is still stubbed.
      </Text>
      <MessageBanner tone="error" message={error} />
      {status === 'loading_passport' ? <ActivityIndicator color={colors.mint} /> : null}
      {passportEvents.length === 0 && status !== 'loading_passport' ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.copy}>Adopt and care for your Pawket to grow this passport.</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {passportEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <Text style={styles.eventType}>{label(event.type)}</Text>
              <Text style={styles.eventTitle}>{event.title}</Text>
              {event.description ? <Text style={styles.copy}>{event.description}</Text> : null}
              <Text style={styles.date}>{new Date(event.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
      <Link href="/home" style={styles.link}>
        Back home
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.mint, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 38, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  timeline: { gap: 12 },
  eventCard: {
    backgroundColor: colors.card,
    borderColor: '#2d2645',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  eventType: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eventTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  date: { color: colors.amber, fontWeight: '700' },
  empty: { backgroundColor: colors.card, borderRadius: 20, padding: 18, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  link: { color: colors.mint, fontWeight: '900', fontSize: 16 },
});
