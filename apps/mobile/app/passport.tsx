import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GlassPanel,
  Pill,
  ProgressBar,
  SectionHeader,
  StateBlock,
} from '../src/components/DesignSystem';
import { MessageBanner } from '../src/components/MessageBanner';
import { PetAvatar } from '../src/components/PetAvatar';
import { Screen } from '../src/components/Screen';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

function label(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function shorten(value?: string) {
  if (!value) return 'No wallet connected';
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

export default function PassportScreen() {
  const { error, loadPassport, passportEvents, pet, status, wallet } = usePawketSession();

  useEffect(() => {
    void loadPassport();
  }, [loadPassport]);

  return (
    <Screen nav>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Pet Passport</Text>
          <Text style={styles.title}>{pet ? `${pet.name}'s identity` : 'Passport timeline'}</Text>
        </View>
        <Pill tone="cyan">dev/API</Pill>
      </View>
      <Text style={styles.copy}>
        A living identity card for care, progression, and milestones. On-chain language stays
        reserved until passport syncing is wired.
      </Text>

      <MessageBanner tone="error" message={error} />

      {pet ? (
        <GlassPanel glow style={styles.identityCard}>
          <View style={styles.identityHeader}>
            <PetAvatar compact mood={label(pet.mood)} species={pet.species} />
          </View>
          <View style={styles.identityBody}>
            <View>
              <Text style={styles.name}>{pet.name}</Text>
              <Text style={styles.meta}>
                {label(pet.species)} · {label(pet.personality)}
              </Text>
            </View>
            <View style={styles.detailsGrid}>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Owner</Text>
                <Text selectable style={styles.detailValue}>
                  {shorten(wallet?.address ?? pet.ownerWalletAddress)}
                </Text>
              </View>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Bond level</Text>
                <Text style={styles.detailValue}>{pet.level}</Text>
              </View>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Adopted</Text>
                <Text style={styles.detailValue}>
                  {new Date(pet.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Memories</Text>
                <Text style={styles.detailValue}>{passportEvents.length}</Text>
              </View>
            </View>
            <ProgressBar
              max={100}
              value={
                (pet.stats.hunger + pet.stats.happiness + pet.stats.energy + pet.stats.hygiene) / 4
              }
              tone="purple"
            />
          </View>
        </GlassPanel>
      ) : (
        <StateBlock
          title="No identity loaded"
          copy="Connect a wallet and adopt a companion to begin a Passport."
          tone="purple"
        />
      )}

      <SectionHeader
        eyebrow="memory stream"
        title="Timeline"
        action={
          status === 'loading_passport' ? (
            <ActivityIndicator color={colors.solanaGreen} />
          ) : undefined
        }
      />

      {passportEvents.length === 0 && status !== 'loading_passport' ? (
        <StateBlock
          title="No memories unlocked yet"
          copy="Care for your Pawket to write the first Passport memory."
          icon="book-outline"
          tone="cyan"
          action={
            <Link href="/home" asChild>
              <Pressable style={styles.homeButton}>
                <Text style={styles.homeButtonText}>Start a ritual</Text>
              </Pressable>
            </Link>
          }
        />
      ) : (
        <View style={styles.timeline}>
          {passportEvents.map((event, index) => (
            <View key={event.id} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View style={styles.timelineDot}>
                  <Ionicons
                    color={colors.black}
                    name={index === 0 ? 'sparkles' : 'paw'}
                    size={12}
                  />
                </View>
                <View style={styles.timelineLine} />
              </View>
              <GlassPanel style={styles.eventCard}>
                <Pill
                  tone={
                    event.type === 'daily_reward'
                      ? 'green'
                      : event.type === 'level_up'
                        ? 'purple'
                        : 'cyan'
                  }
                >
                  {label(event.type)}
                </Pill>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.description ? (
                  <Text style={styles.eventCopy}>{event.description}</Text>
                ) : null}
                <Text style={styles.date}>{new Date(event.createdAt).toLocaleString()}</Text>
              </GlassPanel>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  kicker: { ...typography.micro, color: colors.solanaGreen, textTransform: 'uppercase' },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textSoft },
  identityCard: { padding: 0 },
  identityHeader: { padding: spacing.md, paddingBottom: 0 },
  identityBody: { gap: spacing.md, padding: spacing.lg },
  name: { ...typography.h1, color: colors.text },
  meta: { color: colors.muted, fontWeight: '800', marginTop: 4 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailCell: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
  },
  detailLabel: { ...typography.micro, color: colors.faint, textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 5 },
  timeline: { gap: spacing.md },
  timelineRow: { flexDirection: 'row', gap: spacing.sm },
  timelineRail: { alignItems: 'center', width: 26 },
  timelineDot: {
    alignItems: 'center',
    backgroundColor: colors.solanaGreen,
    borderRadius: radius.pill,
    height: 25,
    justifyContent: 'center',
    width: 25,
  },
  timelineLine: { backgroundColor: colors.borderStrong, flex: 1, marginTop: 7, width: 1 },
  eventCard: { flex: 1, gap: spacing.xs },
  eventTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  eventCopy: { color: colors.muted, lineHeight: 20 },
  date: { color: colors.cyan, fontSize: 12, fontWeight: '800' },
  homeButton: {
    backgroundColor: colors.solanaGreen,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  homeButtonText: { color: colors.black, fontWeight: '900' },
});
