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
import { Button, ProgressBar, StateBlock, Surface } from '../components/DesignSystem';
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
type StatKey = keyof Pet['stats'];

const actionConfig: Record<CareActionType, { title: string; copy: string; icon: IconName }> = {
  [CareActionType.Feed]: {
    title: 'Feed',
    copy: 'Hunger',
    icon: 'nutrition-outline',
  },
  [CareActionType.Play]: {
    title: 'Play',
    copy: 'Happiness',
    icon: 'game-controller-outline',
  },
  [CareActionType.Groom]: {
    title: 'Groom',
    copy: 'Hygiene',
    icon: 'water-outline',
  },
  [CareActionType.Rest]: {
    title: 'Rest',
    copy: 'Energy',
    icon: 'moon-outline',
  },
};

const STAT_TO_ACTION: Record<StatKey, CareActionType> = {
  hunger: CareActionType.Feed,
  happiness: CareActionType.Play,
  energy: CareActionType.Rest,
  hygiene: CareActionType.Groom,
};

function statLabel(stat: string) {
  return stat.charAt(0).toUpperCase() + stat.slice(1);
}

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

  return (
    <FadeInUp distance={10}>
      <Surface style={styles.feedbackPanel}>
        <View style={styles.feedbackHeader}>
          <View style={styles.flex}>
            <Text variant="meta" tone="accent">
              {feedback.passportEventTitle ?? 'Memory'}
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
          <Text variant="caption" tone="accent">
            +{feedback.xpGained} XP
          </Text>
          {feedback.levelDelta > 0 ? (
            <Text variant="caption" tone="accent">
              +{feedback.levelDelta} level
            </Text>
          ) : null}
          {visual ? (
            <Text variant="caption" tone="muted">
              {visual.title}
            </Text>
          ) : null}
          {deltas.map(([stat, value]) => (
            <Text key={stat} variant="caption" tone={Number(value) > 0 ? 'success' : 'warning'}>
              {Number(value) > 0 ? '+' : ''}
              {Number(value)} {statLabel(stat)}
            </Text>
          ))}
        </View>
      </Surface>
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
        title="Checking today’s care"
        copy="Your companion is looking at the day so far."
      />
    );
  }

  if (!dailyGoals) {
    return (
      <StateBlock
        title="Daily goals unavailable"
        copy="The ritual board did not respond. Your pet is safe."
        icon="cloud-offline-outline"
        action={<Button label="Try again" onPress={onRetry} tone="ghost" size="md" full={false} />}
      />
    );
  }

  const reward = dailyGoals.reward;
  const canClaim = Boolean(dailyGoals.allGoalsCompleted && reward && !reward.claimed);

  return (
    <Surface style={styles.dailyPanel}>
      <View style={styles.dailyHead}>
        <View style={styles.flex}>
          <Text variant="h3" tone="text">
            Today
          </Text>
          <Text variant="caption" tone="muted">
            {dailyGoals.completedGoals} of {dailyGoals.totalGoals} rituals
            {dailyGoals.currentStreakDays > 0
              ? ` · ${dailyGoals.currentStreakDays}-day streak`
              : ''}
          </Text>
        </View>
        {loading ? <ActivityIndicator color={colors.accent} /> : null}
      </View>
      <ProgressBar max={dailyGoals.totalGoals} value={dailyGoals.completedGoals} tone="accent" />
      {canClaim ? (
        <Button
          icon="gift"
          label={claiming ? 'Claiming…' : `Claim +${reward?.xp ?? 25} XP`}
          onPress={onClaim}
          loading={claiming}
        />
      ) : (
        <Text variant="caption" tone="muted">
          {reward?.claimed
            ? 'Today’s reward is already in the passport.'
            : 'Finish all four rituals to claim today’s XP.'}
        </Text>
      )}
    </Surface>
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
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={config.title}
      accessibilityHint={`Improves ${config.copy}`}
      style={[styles.actionCard, focus && styles.actionFocus, disabled && styles.actionDim]}
    >
      {focus ? (
        <Text variant="meta" tone="inverse" style={styles.suggestTag}>
          Needs this
        </Text>
      ) : done ? (
        <View style={styles.doneTag}>
          <Ionicons color={colors.success} name="checkmark" size={16} />
        </View>
      ) : null}
      <View style={styles.actionIcon}>
        {busy ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Ionicons color={colors.accent} name={config.icon} size={22} />
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
        <Skeleton width={160} height={28} />
        <Skeleton width={120} height={14} />
      </View>
      <Skeleton width="100%" height={248} rounded={radius.xl} />
      <View style={styles.grid}>
        <Skeleton width="47%" height={96} rounded={radius.md} />
        <Skeleton width="47%" height={96} rounded={radius.md} />
        <Skeleton width="47%" height={96} rounded={radius.md} />
        <Skeleton width="47%" height={96} rounded={radius.md} />
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
        subtitle: `${pet.name}'s bond grew.`,
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
    ? `${pet.name}'s ${focus.stat} is ${focus.value < 35 ? 'critical' : 'running low'}. ${actionConfig[STAT_TO_ACTION[focus.stat]].title} would help.`
    : `${pet.name} is doing well. Keep the streak going.`;

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
    : 'No care yet';

  return (
    <Screen nav overlay={<Celebration payload={celebration} onDone={() => setCelebration(null)} />}>
      <FadeInUp>
        <View style={styles.topBar}>
          <View style={styles.flex}>
            <Text variant="title" tone="text" numberOfLines={1}>
              {pet.name}
            </Text>
            <Text variant="caption" tone="muted">
              {label(pet.mood)} · {label(pet.species)} · Level {pet.level}
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
        <View style={styles.xpBlock}>
          <View style={styles.xpRow}>
            <Text variant="meta" tone="faint">
              Bond
            </Text>
            <Text variant="meta" tone="muted">
              {progress}/{needed} XP
            </Text>
          </View>
          <ProgressBar max={needed} value={progress} />
        </View>
      </FadeInUp>

      <FadeInUp delay={50}>
        <PetChamber species={pet.species} mood={label(pet.mood)} reaction={reaction} />
      </FadeInUp>

      <MessageBanner tone="error" message={error} />
      <CareFeedbackPanel feedback={careFeedback} onDismiss={dismissCareFeedback} />

      <View style={[styles.focusHint, focus ? styles.focusHintActive : styles.focusHintCalm]}>
        <Ionicons
          color={focus ? colors.warning : colors.success}
          name={focus ? 'alert-circle' : 'checkmark-circle'}
          size={16}
        />
        <Text variant="caption" tone={focus ? 'warning' : 'success'} style={styles.flex}>
          {focusCopy}
        </Text>
      </View>

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

      <Surface padded style={styles.vitals}>
        <Text variant="h3" tone="text">
          Vitals
        </Text>
        <StatCard label="Hunger" value={pet.stats.hunger} focus={focus?.stat === 'hunger'} />
        <StatCard
          label="Happiness"
          value={pet.stats.happiness}
          focus={focus?.stat === 'happiness'}
        />
        <StatCard label="Energy" value={pet.stats.energy} focus={focus?.stat === 'energy'} />
        <StatCard label="Hygiene" value={pet.stats.hygiene} focus={focus?.stat === 'hygiene'} />
      </Surface>

      <DailyGoalsPanel
        dailyGoals={dailyGoals}
        status={status}
        onClaim={() => {
          tapMedium();
          void claimDailyReward();
        }}
        onRetry={refreshDailyGoals}
      />

      <Text variant="caption" tone="faint">
        Last care · {lastCare}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  gear: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  xpBlock: { gap: 6, marginTop: spacing.sm },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feedbackPanel: { gap: spacing.sm },
  feedbackHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  dismiss: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  focusHint: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  focusHintActive: {
    backgroundColor: colors.warningMuted,
    borderColor: colors.warningLine,
  },
  focusHintCalm: {
    backgroundColor: colors.successMuted,
    borderColor: colors.successLine,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 4,
    minHeight: 116,
    overflow: 'hidden',
    padding: spacing.md,
  },
  actionFocus: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.borderAccent,
  },
  actionDim: { opacity: 0.5 },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    marginBottom: 4,
    width: 40,
  },
  suggestTag: {
    backgroundColor: colors.accent,
    borderBottomLeftRadius: radius.sm,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  doneTag: { position: 'absolute', right: 10, top: 10 },
  vitals: { gap: spacing.md },
  dailyPanel: { gap: spacing.md },
  dailyHead: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  skeletonHead: { gap: spacing.sm },
});
