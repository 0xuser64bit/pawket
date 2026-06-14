import { Ionicons } from '@expo/vector-icons';
import { PassportEventType } from '@pawket/shared';
import { router } from 'expo-router';
import { type ComponentProps, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  Button,
  Divider,
  GlassPanel,
  Pill,
  ProgressBar,
  SectionHeader,
  StateBlock,
} from '../src/components/DesignSystem';
import { FadeInUp } from '../src/components/Motion';
import { MessageBanner } from '../src/components/MessageBanner';
import { PetChamber } from '../src/components/PetChamber';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { colors, radius, spacing } from '../src/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

function label(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function shorten(value?: string) {
  if (!value) return 'No wallet';
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

const eventVisual = (
  type: PassportEventType,
): { icon: IconName; tone: 'purple' | 'cyan' | 'green' | 'amber'; color: string } => {
  if (type === PassportEventType.LevelUp)
    return { icon: 'trending-up', tone: 'green', color: colors.solanaGreen };
  if (type === PassportEventType.DailyReward)
    return { icon: 'gift', tone: 'amber', color: colors.amber };
  if (type === PassportEventType.Adopted)
    return { icon: 'sparkles', tone: 'purple', color: colors.solanaPurple };
  return { icon: 'paw', tone: 'cyan', color: colors.cyan };
};

function DetailCell({ label: l, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCell}>
      <Text variant="micro" tone="faint">
        {l}
      </Text>
      <Text variant="label" tone="text" selectable style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

export default function PassportScreen() {
  const { error, loadPassport, passportEvents, pet, status, wallet } = usePawketSession();

  useEffect(() => {
    void loadPassport();
  }, [loadPassport]);

  const vitality = pet
    ? (pet.stats.hunger + pet.stats.happiness + pet.stats.energy + pet.stats.hygiene) / 4
    : 0;

  return (
    <Screen nav>
      <FadeInUp>
        <View style={styles.topRow}>
          <View style={styles.flex}>
            <Text variant="eyebrow" tone="cyan">
              Pet Passport
            </Text>
            <Text variant="title" tone="text" numberOfLines={1}>
              {pet ? `${pet.name}'s identity` : 'Passport timeline'}
            </Text>
          </View>
          <Pill tone="cyan">dev/API</Pill>
        </View>
        <Text variant="body" tone="soft">
          A living identity card for care, progression and milestones. On-chain language stays
          reserved until passport syncing is wired.
        </Text>
      </FadeInUp>

      <MessageBanner tone="error" message={error} />

      {pet ? (
        <FadeInUp delay={70}>
          <GlassPanel glow="cyan" padded={false} style={styles.idCard}>
            <View style={styles.idHeader}>
              <PetChamber compact species={pet.species} mood={label(pet.mood)} size={120} />
            </View>
            <View style={styles.idBody}>
              <View>
                <Text variant="h1" tone="text">
                  {pet.name}
                </Text>
                <Text variant="label" tone="muted">
                  {label(pet.species)} · {label(pet.personality)}
                </Text>
              </View>
              <View style={styles.detailGrid}>
                <DetailCell
                  label="Owner"
                  value={shorten(wallet?.address ?? pet.ownerWalletAddress)}
                />
                <DetailCell label="Bond level" value={`${pet.level}`} />
                <DetailCell label="Adopted" value={new Date(pet.createdAt).toLocaleDateString()} />
                <DetailCell label="Memories" value={`${passportEvents.length}`} />
              </View>
              <View>
                <View style={styles.vitalRow}>
                  <Text variant="micro" tone="muted">
                    Vitality
                  </Text>
                  <Text variant="micro" tone="cyan">
                    {Math.round(vitality)}%
                  </Text>
                </View>
                <ProgressBar max={100} value={vitality} tone="cyan" />
              </View>
            </View>
          </GlassPanel>
        </FadeInUp>
      ) : (
        <StateBlock
          title="No identity loaded"
          copy="Connect a wallet and adopt a companion to begin a Passport."
          icon="finger-print-outline"
          tone="purple"
        />
      )}

      <FadeInUp delay={120}>
        <SectionHeader
          eyebrow="memory stream"
          title="Timeline"
          tone="purple"
          action={
            status === 'loading_passport' ? (
              <ActivityIndicator color={colors.solanaGreen} />
            ) : undefined
          }
        />
      </FadeInUp>

      {passportEvents.length === 0 && status !== 'loading_passport' ? (
        <StateBlock
          title="No memories unlocked yet"
          copy="Care for your Pawket to write the first Passport memory."
          icon="book-outline"
          tone="cyan"
          action={
            <Button
              label="Start a ritual"
              onPress={() => router.push('/home')}
              tone="cyan"
              size="md"
              full={false}
            />
          }
        />
      ) : (
        <View style={styles.timeline}>
          {passportEvents.map((event, index) => {
            const v = eventVisual(event.type);
            const isLast = index === passportEvents.length - 1;
            return (
              <FadeInUp key={event.id} delay={Math.min(index * 50, 300)}>
                <View style={styles.timelineRow}>
                  <View style={styles.rail}>
                    <View style={[styles.railDot, { backgroundColor: v.color }]}>
                      <Ionicons color={colors.black} name={v.icon} size={12} />
                    </View>
                    {!isLast ? <View style={styles.railLine} /> : null}
                  </View>
                  <GlassPanel style={styles.eventCard}>
                    <Pill tone={v.tone}>{label(event.type)}</Pill>
                    <Text variant="h3" tone="text">
                      {event.title}
                    </Text>
                    {event.description ? (
                      <Text variant="body" tone="muted">
                        {event.description}
                      </Text>
                    ) : null}
                    <Divider style={styles.eventDivider} />
                    <Text variant="caption" tone="faint">
                      {new Date(event.createdAt).toLocaleString()}
                    </Text>
                  </GlassPanel>
                </View>
              </FadeInUp>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  idCard: { overflow: 'hidden' },
  idHeader: { padding: spacing.md, paddingBottom: 0 },
  idBody: { gap: spacing.md, padding: spacing.lg },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailCell: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '45%',
    flexGrow: 1,
    gap: 4,
    padding: spacing.md,
  },
  detailValue: { marginTop: 2 },
  vitalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: spacing.sm },
  rail: { alignItems: 'center', width: 26 },
  railDot: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  railLine: { backgroundColor: colors.borderStrong, flex: 1, marginVertical: 6, width: 1.5 },
  eventCard: { flex: 1, gap: 6, marginBottom: spacing.sm },
  eventDivider: { marginTop: 4 },
});
