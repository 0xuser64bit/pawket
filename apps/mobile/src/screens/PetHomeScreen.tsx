import { Ionicons } from '@expo/vector-icons';
import {
  calculateXpForNextLevel,
  CareActionType,
  type DailyGoalsResponse,
  type Pet,
} from '@pawket/shared';
import { router } from 'expo-router';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Divider,
  GlassPanel,
  IconTile,
  Pill,
  ProgressBar,
  SectionHeader,
  StateBlock,
} from '../components/DesignSystem';
import { AnimatedCount } from '../components/AnimatedCount';
import { Celebration, type CelebrationPayload } from '../components/Celebration';
import { FadeInUp, PressableScale, Skeleton } from '../components/Motion';
import { MessageBanner } from '../components/MessageBanner';
import { PetChamber, type ChamberReaction } from '../components/PetChamber';
import type { CareReaction } from '../components/PetReaction';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { Text } from '../components/Text';
import { celebrate, notifyWarning, tapMedium } from '../feedback/haptics';
import { usePawketSession } from '../state/PawketSessionContext';
import { colors, radius, spacing } from '../theme/tokens';

function label(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

type IconName = ComponentProps<typeof Ionicons>['name'];
type ActionTone = 'amber' | 'magenta' | 'green' | 'cyan';
type StatKey = keyof Pet['stats'];

const actionConfig: Record<
  CareActionType,
  { title: string; copy: string; icon: IconName; tone: ActionTone }
> = {
  [CareActionType.Feed]: {
    title: 'Feed',
    copy: '+Hunger · +Bond XP',
    icon: 'nutrition-outline',
    tone: 'amber',
  },
  [CareActionType.Play]: {
    title: 'Play',
    copy: '+Happiness · uses energy',
    icon: 'game-controller-outline',
    tone: 'magenta',
  },
  [CareActionType.Groom]: {
    title: 'Groom',
    copy: '+Hygiene · memory chance',
    icon: 'sparkles-outline',
    tone: 'green',
  },
  [CareActionType.Rest]: {
    title: 'Rest',
    copy: '+Energy · calm aura',
    icon: 'moon-outline',
    tone: 'cyan',
  },
};

/** Which ritual best addresses each vital. */
const STAT_TO_ACTION: Record<StatKey, CareActionType> = {
  hunger: CareActionType.Feed,
  happiness: CareActionType.Play,
  energy: CareActionType.Rest,
  hygiene: CareActionType.Groom,
};

function toneColor(tone: ActionTone) {
  if (tone === 'amber') return colors.amber;
  if (tone === 'magenta') return colors.magenta;
  if (tone === 'cyan') return colors.cyan;
  return colors.solanaGreen;
}

function statLabel(stat: string) {
  return stat.charAt(0).toUpperCase() + stat.slice(1);
}

/** Returns the vital most in need of care, or null if the pet is thriving. */
function findCareFocus(stats: Pet['stats']): { stat: StatKey; value: number } | null {
  const entries = Object.entries(stats) as [StatKey, number][];
  const lowest = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  return lowest[1] < 70 ? { stat: lowest[0], value: lowest[1] } : null;
}

function CareFeedbackPanel({
  feedback,
  onDismiss,
}: {
  feedback: ReturnType<typeof usePawketSession>['careFeedback'];
  onDismiss: () => void;
}) {
  if (!feedback) return null;
  const deltas = Object.entries(feedback.statDeltas).filter(([, value]) => Boolean(value));
  const isDailyReward = feedback.actionType === 'daily_reward';
  const visual = isDailyReward ? null : actionConfig[feedback.actionType as CareActionType];
  const color = visual ? toneColor(visual.tone) : colors.solanaGreen;

  return (
    <FadeInUp distance={10}>
      <GlassPanel glow="green" style={[styles.feedbackPanel, { borderColor: `${color}66` }]}>
        <View style={styles.feedbackHeader}>
          <View
            style={[
              styles.feedbackIcon,
              { backgroundColor: `${color}1f`, borderColor: `${color}66` },
            ]}
          >
            <Ionicons color={color} name={visual?.icon ?? 'gift-outline'} size={20} />
          </View>
          <View style={styles.flex}>
            <Text variant="micro" style={{ color }}>
              {feedback.passportEventTitle ?? 'Passport memory'}
            </Text>
            <Text variant="h3" tone="text">
              {feedback.title}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            hitSlop={8}
            onPress={onDismiss}
            style={styles.dismiss}
          >
            <Ionicons color={colors.faint} name="close" size={16} />
          </Pressable>
        </View>
        <Text variant="body" tone="soft">
          {feedback.copy}
        </Text>
        <View style={styles.rewards}>
          <View style={styles.rewardChip}>
            <Ionicons color={colors.solanaGreen} name="flash" size={13} />
            <Text variant="caption" tone="text">
              +{feedback.xpGained} XP
            </Text>
          </View>
          {feedback.levelDelta > 0 ? (
            <View style={styles.rewardChip}>
              <Ionicons color={colors.cyan} name="trending-up" size={13} />
              <Text variant="caption" tone="text">
                +{feedback.levelDelta} bond level
              </Text>
            </View>
          ) : null}
          {deltas.map(([stat, value]) => (
            <View key={stat} style={styles.rewardChip}>
              <Text
                variant="caption"
                style={{ color: Number(value) > 0 ? colors.solanaGreen : colors.amber }}
              >
                {Number(value) > 0 ? '+' : ''}
                {Number(value)} {statLabel(stat)}
              </Text>
            </View>
          ))}
        </View>
      </GlassPanel>
    </FadeInUp>
  );
}

function DailyGoalsPanel({
  dailyGoals,
  status,
  onClaim,
  onRetry,
}: {
  dailyGoals: DailyGoalsResponse | null;
  status: string;
  onClaim: () => void;
  onRetry: () => void;
}) {
  const loading = status === 'loading_daily_goals';
  const claiming = status === 'claiming_daily_reward';

  if (loading && !dailyGoals) {
    return (
      <StateBlock
        loading
        title="Syncing daily rituals"
        copy="Your companion is checking today's care map."
        tone="green"
      />
    );
  }

  if (!dailyGoals) {
    return (
      <StateBlock
        title="Daily signal unavailable"
        copy="The ritual board did not respond. Your pet is safe — try syncing again."
        icon="cloud-offline-outline"
        tone="danger"
        action={
          <Button
            label="Retry ritual board"
            onPress={onRetry}
            tone="ghost"
            size="md"
            full={false}
          />
        }
      />
    );
  }

  const reward = dailyGoals.reward;
  const canClaim = Boolean(dailyGoals.allGoalsCompleted && reward && !reward.claimed);

  return (
    <GlassPanel glow={canClaim ? 'amber' : false} style={styles.dailyPanel}>
      <SectionHeader
        eyebrow="daily ritual"
        title="Season streak"
        tone="amber"
        action={
          loading ? (
            <ActivityIndicator color={colors.solanaGreen} />
          ) : (
            <Pill tone="cyan">{dailyGoals.today} UTC</Pill>
          )
        }
      />
      <View style={styles.summaryRow}>
        <View style={styles.summaryBlock}>
          <Text variant="stat" tone="text">
            {dailyGoals.completedGoals}/{dailyGoals.totalGoals}
          </Text>
          <Text variant="micro" tone="muted">
            Rituals today
          </Text>
        </View>
        <View style={styles.summaryBlock}>
          <View style={styles.streakValue}>
            <Ionicons color={colors.amber} name="flame" size={20} />
            <Text variant="stat" tone="text">
              {dailyGoals.currentStreakDays}
            </Text>
          </View>
          <Text variant="micro" tone="muted">
            Day streak
          </Text>
        </View>
      </View>
      <ProgressBar max={dailyGoals.totalGoals} value={dailyGoals.completedGoals} tone="amber" />
      {canClaim ? (
        <Button
          icon="gift"
          label={claiming ? 'Claiming memory…' : `Claim +${reward?.xp ?? 25} XP`}
          onPress={onClaim}
          tone="amber"
          loading={claiming}
        />
      ) : (
        <Text variant="caption" tone="muted">
          {reward?.claimed
            ? `Reward memory unlocked. Current streak: ${dailyGoals.currentStreakDays} day${dailyGoals.currentStreakDays === 1 ? '' : 's'}.`
            : 'Complete all four care rituals to unlock the daily XP memory.'}
        </Text>
      )}
    </GlassPanel>
  );
}

function CareActionCard({
  action,
  disabled,
  busy,
  focus,
  done,
  onPress,
}: {
  action: CareActionType;
  disabled: boolean;
  busy: boolean;
  focus: boolean;
  done: boolean;
  onPress: () => void;
}) {
  const config = actionConfig[action];
  const color = toneColor(config.tone);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={config.title}
      accessibilityHint={config.copy}
      style={[
        styles.actionCard,
        { borderColor: `${color}40`, backgroundColor: `${color}12` },
        focus && { borderColor: `${color}aa`, backgroundColor: `${color}1f` },
        disabled && styles.actionDim,
      ]}
    >
      {focus ? (
        <View style={[styles.suggestTag, { backgroundColor: color }]}>
          <Text variant="micro" tone="black" style={styles.suggestText}>
            Suggested
          </Text>
        </View>
      ) : done ? (
        <View style={styles.doneTag}>
          <Ionicons color={colors.solanaGreen} name="checkmark-circle" size={18} />
        </View>
      ) : null}
      <View
        style={[styles.actionIcon, { backgroundColor: `${color}1f`, borderColor: `${color}66` }]}
      >
        {busy ? (
          <ActivityIndicator color={color} />
        ) : (
          <Ionicons color={color} name={config.icon} size={22} />
        )}
      </View>
      <Text variant="h3" tone="text">
        {busy ? 'Working…' : config.title}
      </Text>
      <Text variant="caption" tone="muted">
        {config.copy}
      </Text>
    </PressableScale>
  );
}

function HomeSkeleton() {
  return (
    <Screen nav>
      <View style={styles.skeletonHead}>
        <Skeleton width={140} height={14} />
        <Skeleton width={180} height={30} />
      </View>
      <Skeleton width="100%" height={296} rounded={radius.xxl} />
      <Skeleton width="100%" height={132} rounded={radius.xl} />
      <View style={styles.grid}>
        <Skeleton width="47%" height={108} rounded={radius.lg} />
        <Skeleton width="47%" height={108} rounded={radius.lg} />
        <Skeleton width="47%" height={108} rounded={radius.lg} />
        <Skeleton width="47%" height={108} rounded={radius.lg} />
      </View>
    </Screen>
  );
}

export function PetHomeScreen() {
  const {
    careFeedback,
    careForPet,
    claimDailyReward,
    dailyGoals,
    dismissCareFeedback,
    error,
    pet,
    refreshDailyGoals,
    status,
  } = usePawketSession();
  const [activeCareAction, setActiveCareAction] = useState<CareActionType | null>(null);
  const [reaction, setReaction] = useState<ChamberReaction | null>(null);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);
  const nonceRef = useRef(0);

  // Translate a resolved care result into the pet's visible reaction, haptics,
  // and — for the big beats — a celebration moment.
  useEffect(() => {
    if (!careFeedback || !pet) return;
    nonceRef.current += 1;
    const nonce = nonceRef.current;
    const isReward = careFeedback.actionType === 'daily_reward';
    const leveled = careFeedback.levelDelta > 0;
    const type: CareReaction =
      leveled || isReward ? 'celebrate' : (careFeedback.actionType as CareReaction);
    setReaction({ type, nonce, xp: careFeedback.xpGained });

    if (leveled) {
      celebrate();
      setCelebration({
        key: nonce,
        title: `Level ${pet.level}`,
        subtitle: `${pet.name}'s bond grew stronger.`,
        icon: 'trending-up',
      });
    } else if (isReward) {
      celebrate();
      setCelebration({
        key: nonce,
        title: 'Streak sealed',
        subtitle: careFeedback.copy,
        icon: 'flame',
      });
    }
    // Keyed on the feedback object so each resolved care result fires once.
  }, [careFeedback]);

  useEffect(() => {
    if (error) notifyWarning();
  }, [error]);

  if (!pet) {
    return <HomeSkeleton />;
  }

  const nextLevelXp = calculateXpForNextLevel(pet.level);
  const currentLevelXp = calculateXpForNextLevel(pet.level - 1);
  const progress = Math.max(0, pet.xp - currentLevelXp);
  const needed = Math.max(1, nextLevelXp - currentLevelXp);
  const careDisabled = status === 'caring' || status === 'claiming_daily_reward';

  const focus = findCareFocus(pet.stats);
  const focusAction = focus ? STAT_TO_ACTION[focus.stat] : null;
  const focusCopy = focus
    ? `${pet.name}'s ${focus.stat} is ${focus.value < 35 ? 'critical' : 'running low'} — a ${actionConfig[STAT_TO_ACTION[focus.stat]].title.toLowerCase()} would help.`
    : `${pet.name} is thriving. Keep the daily streak alive.`;

  const doneToday = new Map<CareActionType, boolean>();
  dailyGoals?.goals.forEach((goal) => doneToday.set(goal.actionType, goal.completed));

  const handleCareAction = async (action: CareActionType) => {
    tapMedium();
    setActiveCareAction(action);
    try {
      await careForPet(action);
    } finally {
      setActiveCareAction(null);
    }
  };

  const lastCare = pet.lastCaredAt
    ? `${label(pet.lastCareActionType ?? 'care')} · ${new Date(pet.lastCaredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'No care memory yet';

  return (
    <Screen nav overlay={<Celebration payload={celebration} onDone={() => setCelebration(null)} />}>
      <FadeInUp>
        <View style={styles.topBar}>
          <View style={styles.flex}>
            <Text variant="eyebrow" tone="green">
              Feeling {label(pet.mood)}
            </Text>
            <Text variant="title" tone="text" numberOfLines={1}>
              {pet.name}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
            onPress={() => router.push('/settings')}
            style={styles.gear}
          >
            <Ionicons color={colors.textSoft} name="settings-outline" size={20} />
          </Pressable>
        </View>
      </FadeInUp>

      <FadeInUp delay={60}>
        <PetChamber species={pet.species} mood={label(pet.mood)} reaction={reaction} />
      </FadeInUp>

      <FadeInUp delay={110}>
        <GlassPanel glow style={styles.bondCard}>
          <View style={styles.bondTop}>
            <View>
              <Text variant="micro" tone="purple">
                Bond level
              </Text>
              <AnimatedCount value={pet.level} variant="display" tone="text" />
            </View>
            <View style={styles.bondTags}>
              <Pill tone="purple">{label(pet.species)}</Pill>
              <Pill tone="cyan">{label(pet.personality)}</Pill>
            </View>
          </View>
          <Divider />
          <View style={styles.xpRow}>
            <Text variant="label" tone="soft">
              XP to next evolution
            </Text>
            <Text variant="label" tone="green">
              {progress}/{needed}
            </Text>
          </View>
          <ProgressBar max={needed} value={progress} glow />
          <View style={styles.lastCare}>
            <Ionicons color={colors.faint} name="time-outline" size={14} />
            <Text variant="caption" tone="muted">
              Last ritual · {lastCare}
            </Text>
          </View>
        </GlassPanel>
      </FadeInUp>

      <MessageBanner tone="error" message={error} />
      <CareFeedbackPanel feedback={careFeedback} onDismiss={dismissCareFeedback} />

      <FadeInUp delay={140}>
        <SectionHeader eyebrow="vitals" title="Care dashboard" tone="cyan" />
      </FadeInUp>
      <View style={styles.grid}>
        <StatCard label="Hunger" value={pet.stats.hunger} focus={focus?.stat === 'hunger'} />
        <StatCard
          label="Happiness"
          value={pet.stats.happiness}
          focus={focus?.stat === 'happiness'}
        />
        <StatCard label="Energy" value={pet.stats.energy} focus={focus?.stat === 'energy'} />
        <StatCard label="Hygiene" value={pet.stats.hygiene} focus={focus?.stat === 'hygiene'} />
      </View>

      <FadeInUp delay={160}>
        <View style={styles.ritualHead}>
          <SectionHeader eyebrow="touch actions" title="Care rituals" tone="magenta" />
          <View style={[styles.focusHint, focus ? styles.focusHintActive : styles.focusHintCalm]}>
            <Ionicons
              color={focus ? colors.amber : colors.solanaGreen}
              name={focus ? 'alert-circle' : 'checkmark-circle'}
              size={15}
            />
            <Text variant="caption" tone={focus ? 'amber' : 'green'} style={styles.flex}>
              {focusCopy}
            </Text>
          </View>
        </View>
      </FadeInUp>
      <View style={styles.grid}>
        {Object.values(CareActionType).map((action) => (
          <CareActionCard
            key={action}
            action={action}
            busy={status === 'caring' && activeCareAction === action}
            disabled={careDisabled}
            focus={focusAction === action && !doneToday.get(action)}
            done={Boolean(doneToday.get(action))}
            onPress={() => void handleCareAction(action)}
          />
        ))}
      </View>

      <DailyGoalsPanel
        dailyGoals={dailyGoals}
        status={status}
        onClaim={() => {
          tapMedium();
          void claimDailyReward();
        }}
        onRetry={refreshDailyGoals}
      />

      <PressableScale
        onPress={() => router.push('/passport')}
        accessibilityLabel="Open Pet Passport"
      >
        <GlassPanel style={styles.passportCard}>
          <IconTile icon="finger-print-outline" tone="cyan" />
          <View style={styles.flex}>
            <Text variant="h3" tone="text">
              Pet Passport
            </Text>
            <Text variant="caption" tone="muted">
              Every action becomes part of its story.
            </Text>
          </View>
          <Ionicons color={colors.faint} name="arrow-forward" size={18} />
        </GlassPanel>
      </PressableScale>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  gear: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  bondCard: { gap: spacing.sm },
  bondTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  bondTags: { alignItems: 'flex-end', gap: 6 },
  xpRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  lastCare: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 2 },
  feedbackPanel: { gap: spacing.sm },
  feedbackHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  feedbackIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  dismiss: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  rewardChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  ritualHead: { gap: spacing.sm },
  focusHint: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  focusHintActive: {
    backgroundColor: 'rgba(255,176,77,0.10)',
    borderColor: 'rgba(255,176,77,0.4)',
  },
  focusHintCalm: {
    backgroundColor: 'rgba(23,229,137,0.08)',
    borderColor: 'rgba(23,229,137,0.34)',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    borderCurve: 'continuous',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 5,
    minHeight: 128,
    overflow: 'hidden',
    padding: spacing.md,
  },
  actionDim: { opacity: 0.5 },
  actionIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginBottom: 4,
    width: 44,
  },
  suggestTag: {
    borderBottomLeftRadius: radius.md,
    position: 'absolute',
    right: 0,
    top: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  suggestText: { fontSize: 9 },
  doneTag: { position: 'absolute', right: 10, top: 10 },
  dailyPanel: { gap: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryBlock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: spacing.md,
  },
  streakValue: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  passportCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  skeletonHead: { gap: spacing.sm, marginBottom: spacing.xs },
});
