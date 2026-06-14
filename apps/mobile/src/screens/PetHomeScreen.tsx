import { Ionicons } from '@expo/vector-icons';
import { calculateXpForNextLevel, CareActionType, type DailyGoalsResponse } from '@pawket/shared';
import { router } from 'expo-router';
import { type ComponentProps, useState } from 'react';
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
import { FadeInUp, PressableScale } from '../components/Motion';
import { MessageBanner } from '../components/MessageBanner';
import { PetChamber } from '../components/PetChamber';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { Text } from '../components/Text';
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

function toneColor(tone: ActionTone) {
  if (tone === 'amber') return colors.amber;
  if (tone === 'magenta') return colors.magenta;
  if (tone === 'cyan') return colors.cyan;
  return colors.solanaGreen;
}

function statLabel(stat: string) {
  return stat.charAt(0).toUpperCase() + stat.slice(1);
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
    <GlassPanel style={styles.dailyPanel}>
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
            Rituals complete
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
      <View style={styles.goalList}>
        {dailyGoals.goals.map((goal) => (
          <View key={goal.actionType} style={styles.goalRow}>
            <View style={[styles.goalDot, goal.completed && styles.goalDotDone]}>
              {goal.completed ? <Ionicons color={colors.black} name="checkmark" size={11} /> : null}
            </View>
            <Text variant="label" tone="soft" style={styles.flex}>
              {goal.title}
            </Text>
            <Text
              variant="micro"
              style={{ color: goal.completed ? colors.solanaGreen : colors.faint }}
            >
              {goal.completed ? 'Logged' : 'Open'}
            </Text>
          </View>
        ))}
      </View>
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
            : 'Complete all four care actions to unlock the daily XP memory.'}
        </Text>
      )}
    </GlassPanel>
  );
}

function CareActionCard({
  action,
  disabled,
  busy,
  onPress,
}: {
  action: CareActionType;
  disabled: boolean;
  busy: boolean;
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
        disabled && styles.actionDim,
      ]}
    >
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

export function PetHomeScreen() {
  const {
    careFeedback,
    careForPet,
    claimDailyReward,
    dailyGoals,
    dismissCareFeedback,
    error,
    notice,
    pet,
    refreshDailyGoals,
    status,
  } = usePawketSession();
  const [activeCareAction, setActiveCareAction] = useState<CareActionType | null>(null);

  if (!pet) {
    return (
      <Screen nav>
        <StateBlock
          loading
          title="Your companion is waking up"
          copy="Loading the current Pawket state from the dev/API path."
          tone="green"
        />
      </Screen>
    );
  }

  const nextLevelXp = calculateXpForNextLevel(pet.level);
  const currentLevelXp = calculateXpForNextLevel(pet.level - 1);
  const progress = Math.max(0, pet.xp - currentLevelXp);
  const needed = Math.max(1, nextLevelXp - currentLevelXp);
  const careDisabled = status === 'caring' || status === 'claiming_daily_reward';

  const handleCareAction = async (action: CareActionType) => {
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
    <Screen nav>
      <FadeInUp>
        <View style={styles.topBar}>
          <View style={styles.flex}>
            <Text variant="eyebrow" tone="green">
              Companion chamber
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
        <PetChamber species={pet.species} mood={label(pet.mood)} />
      </FadeInUp>

      <FadeInUp delay={110}>
        <GlassPanel glow style={styles.bondCard}>
          <View style={styles.bondTop}>
            <View>
              <Text variant="micro" tone="purple">
                Bond level
              </Text>
              <Text variant="display" tone="text">
                {pet.level}
              </Text>
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

      <MessageBanner tone="success" message={notice} />
      <MessageBanner tone="error" message={error} />
      <CareFeedbackPanel feedback={careFeedback} onDismiss={dismissCareFeedback} />

      <FadeInUp delay={140}>
        <SectionHeader eyebrow="vitals" title="Care dashboard" tone="cyan" />
      </FadeInUp>
      <View style={styles.grid}>
        <StatCard label="Hunger" value={pet.stats.hunger} />
        <StatCard label="Happiness" value={pet.stats.happiness} />
        <StatCard label="Energy" value={pet.stats.energy} />
        <StatCard label="Hygiene" value={pet.stats.hygiene} />
      </View>

      <FadeInUp delay={160}>
        <SectionHeader eyebrow="touch actions" title="Care rituals" tone="magenta" />
      </FadeInUp>
      <View style={styles.grid}>
        {Object.values(CareActionType).map((action) => (
          <CareActionCard
            key={action}
            action={action}
            busy={status === 'caring' && activeCareAction === action}
            disabled={careDisabled}
            onPress={() => void handleCareAction(action)}
          />
        ))}
      </View>

      <DailyGoalsPanel
        dailyGoals={dailyGoals}
        status={status}
        onClaim={claimDailyReward}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 5,
    minHeight: 128,
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
  dailyPanel: { gap: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryBlock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: spacing.md,
  },
  streakValue: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  goalList: { gap: spacing.xs },
  goalRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 36 },
  goalDot: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  goalDotDone: { backgroundColor: colors.solanaGreen, borderColor: colors.solanaGreen },
  passportCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
});
