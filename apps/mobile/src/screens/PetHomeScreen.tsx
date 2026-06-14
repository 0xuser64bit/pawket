import { Ionicons } from '@expo/vector-icons';
import { calculateXpForNextLevel, CareActionType, type DailyGoalsResponse } from '@pawket/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  GlassPanel,
  Pill,
  ProgressBar,
  SectionHeader,
  StateBlock,
} from '../components/DesignSystem';
import { MessageBanner } from '../components/MessageBanner';
import { PetAvatar } from '../components/PetAvatar';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { usePawketSession } from '../state/PawketSessionContext';
import { colors, radius, spacing, typography } from '../theme/tokens';

function label(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const actionConfig = {
  [CareActionType.Feed]: {
    title: 'Feed',
    copy: '+Hunger · +Bond XP',
    icon: 'nutrition-outline' as const,
    tone: 'amber' as const,
  },
  [CareActionType.Play]: {
    title: 'Play',
    copy: '+Happiness · uses energy',
    icon: 'game-controller-outline' as const,
    tone: 'magenta' as const,
  },
  [CareActionType.Groom]: {
    title: 'Groom',
    copy: '+Hygiene · memory chance',
    icon: 'sparkles-outline' as const,
    tone: 'green' as const,
  },
  [CareActionType.Rest]: {
    title: 'Rest',
    copy: '+Energy · calm aura',
    icon: 'moon-outline' as const,
    tone: 'cyan' as const,
  },
};

function toneColor(tone: 'amber' | 'magenta' | 'green' | 'cyan') {
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
  const actionVisual = isDailyReward ? null : actionConfig[feedback.actionType as CareActionType];
  const color = actionVisual ? toneColor(actionVisual.tone) : colors.solanaGreen;

  return (
    <GlassPanel glow style={[styles.feedbackPanel, { borderColor: `${color}55` }]}>
      <View style={styles.feedbackHeader}>
        <View
          style={[
            styles.feedbackIcon,
            { backgroundColor: `${color}16`, borderColor: `${color}66` },
          ]}
        >
          <Ionicons color={color} name={actionVisual?.icon ?? 'gift-outline'} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedbackEyebrow}>
            {feedback.passportEventTitle ?? 'Passport memory'}
          </Text>
          <Text style={styles.feedbackTitle}>{feedback.title}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.dismissButton}>
          <Ionicons color={colors.faint} name="close" size={18} />
        </Pressable>
      </View>
      <Text style={styles.feedbackCopy}>{feedback.copy}</Text>
      <View style={styles.feedbackRewards}>
        <View style={styles.rewardChip}>
          <Ionicons color={colors.solanaGreen} name="flash-outline" size={15} />
          <Text style={styles.rewardText}>+{feedback.xpGained} XP</Text>
        </View>
        {feedback.levelDelta > 0 ? (
          <View style={styles.rewardChip}>
            <Ionicons color={colors.cyan} name="trending-up-outline" size={15} />
            <Text style={styles.rewardText}>+{feedback.levelDelta} bond level</Text>
          </View>
        ) : null}
        {deltas.map(([stat, value]) => (
          <View key={stat} style={styles.rewardChip}>
            <Text style={[styles.deltaSign, Number(value) > 0 ? styles.deltaUp : styles.deltaDown]}>
              {Number(value) > 0 ? '+' : ''}
              {Number(value)}
            </Text>
            <Text style={styles.rewardText}>{statLabel(stat)}</Text>
          </View>
        ))}
      </View>
    </GlassPanel>
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
        copy="The ritual board did not respond. Your pet is safe; try syncing again."
        icon="cloud-offline-outline"
        tone="danger"
        action={<Button label="Retry ritual board" onPress={onRetry} tone="ghost" />}
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
        action={
          loading ? (
            <ActivityIndicator color={colors.solanaGreen} />
          ) : (
            <Pill tone="cyan">{dailyGoals.today} UTC</Pill>
          )
        }
      />
      <View style={styles.goalSummary}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryValue}>
            {dailyGoals.completedGoals}/{dailyGoals.totalGoals}
          </Text>
          <Text style={styles.summaryLabel}>Rituals complete</Text>
        </View>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryValue}>{dailyGoals.currentStreakDays}</Text>
          <Text style={styles.summaryLabel}>Day streak</Text>
        </View>
      </View>
      <ProgressBar max={dailyGoals.totalGoals} value={dailyGoals.completedGoals} />
      <View style={styles.goalList}>
        {dailyGoals.goals.map((goal) => (
          <View key={goal.actionType} style={styles.goalRow}>
            <View style={[styles.goalDot, goal.completed && styles.goalDotDone]}>
              {goal.completed ? <Ionicons color={colors.black} name="checkmark" size={11} /> : null}
            </View>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={[styles.goalStatus, goal.completed && styles.goalStatusDone]}>
              {goal.completed ? 'Memory logged' : 'Open'}
            </Text>
          </View>
        ))}
      </View>
      {canClaim ? (
        <Button
          icon="gift-outline"
          label={claiming ? 'Claiming memory…' : `Claim +${reward?.xp ?? 25} XP`}
          onPress={onClaim}
          tone="green"
          disabled={claiming}
        />
      ) : (
        <Text style={styles.goalHint}>
          {reward?.claimed
            ? `Reward memory unlocked. Current streak: ${dailyGoals.currentStreakDays} day${
                dailyGoals.currentStreakDays === 1 ? '' : 's'
              }.`
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
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { borderColor: `${color}44`, backgroundColor: `${color}10` },
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.actionPressed,
      ]}
    >
      <View
        style={[styles.actionIcon, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}
      >
        {busy ? (
          <ActivityIndicator color={color} />
        ) : (
          <Ionicons color={color} name={config.icon} size={22} />
        )}
      </View>
      <Text style={styles.actionTitle}>{busy ? 'Working…' : config.title}</Text>
      <Text style={styles.actionCopy}>
        {disabled && !busy ? 'Cooldown mechanic active' : config.copy}
      </Text>
    </Pressable>
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
    ? `${label(pet.lastCareActionType ?? 'care')} · ${new Date(pet.lastCaredAt).toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit',
        },
      )}`
    : 'No care memory yet';

  return (
    <Screen nav>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.kicker}>Companion chamber</Text>
          <Text style={styles.title}>{pet.name}</Text>
        </View>
        <Pill tone="green">Level {pet.level}</Pill>
      </View>

      <PetAvatar mood={label(pet.mood)} species={pet.species} />

      <GlassPanel style={styles.identityCard}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.identityTitle}>Bond level {pet.level}</Text>
            <Text style={styles.identitySub}>
              {label(pet.species)} · {label(pet.personality)} · {lastCare}
            </Text>
          </View>
          <Ionicons color={colors.solanaGreen} name="pulse-outline" size={24} />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.xpLabel}>XP to next evolution</Text>
          <Text style={styles.xpValue}>
            {progress}/{needed}
          </Text>
        </View>
        <ProgressBar max={needed} value={progress} />
      </GlassPanel>

      <MessageBanner tone="success" message={notice} />
      <MessageBanner tone="error" message={error} />
      <CareFeedbackPanel feedback={careFeedback} onDismiss={dismissCareFeedback} />

      <SectionHeader eyebrow="vitals" title="Care dashboard" />
      <View style={styles.grid}>
        <StatCard label="Hunger" value={pet.stats.hunger} />
        <StatCard label="Happiness" value={pet.stats.happiness} />
        <StatCard label="Energy" value={pet.stats.energy} />
        <StatCard label="Hygiene" value={pet.stats.hygiene} />
      </View>

      <SectionHeader eyebrow="touch actions" title="Care rituals" />
      <View style={styles.actionGrid}>
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

      <GlassPanel style={styles.passportPreview}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.identityTitle}>Pet Passport</Text>
            <Text style={styles.identitySub}>Every action becomes part of its story.</Text>
          </View>
          <Link href="/passport" asChild>
            <Pressable style={styles.passportButton}>
              <Text style={styles.passportButtonText}>Open</Text>
              <Ionicons color={colors.black} name="arrow-forward" size={15} />
            </Pressable>
          </Link>
        </View>
      </GlassPanel>
    </Screen>
  );
}
const styles = StyleSheet.create({
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  kicker: { ...typography.micro, color: colors.solanaGreen, textTransform: 'uppercase' },
  title: { ...typography.title, color: colors.text },
  identityCard: { gap: spacing.md },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  identityTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  identitySub: { color: colors.muted, lineHeight: 20, marginTop: 4 },
  xpLabel: { color: colors.textSoft, fontWeight: '800' },
  xpValue: { color: colors.solanaGreen, fontWeight: '900' },
  feedbackPanel: { gap: spacing.md },
  feedbackHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  feedbackIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  feedbackEyebrow: {
    ...typography.micro,
    color: colors.solanaGreen,
    textTransform: 'uppercase',
  },
  feedbackTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  feedbackCopy: { color: colors.textSoft, lineHeight: 21 },
  feedbackRewards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  rewardChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  rewardText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  deltaSign: { fontSize: 12, fontWeight: '900' },
  deltaUp: { color: colors.solanaGreen },
  deltaDown: { color: colors.amber },
  dismissButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: 132,
    minWidth: '45%',
    padding: spacing.md,
  },
  actionDisabled: { opacity: 0.58 },
  actionPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  actionIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.xs },
  actionCopy: { color: colors.muted, lineHeight: 19 },
  dailyPanel: { gap: spacing.md },
  goalSummary: { flexDirection: 'row', gap: spacing.sm },
  summaryBlock: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  summaryValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  goalList: { gap: spacing.xs },
  goalRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 38 },
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
  goalTitle: { color: colors.text, flex: 1, fontWeight: '800' },
  goalStatus: { color: colors.amber, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  goalStatusDone: { color: colors.solanaGreen },
  goalHint: { color: colors.muted, lineHeight: 20 },
  passportPreview: { gap: spacing.sm },
  passportButton: {
    alignItems: 'center',
    backgroundColor: colors.solanaGreen,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  passportButtonText: { color: colors.black, fontWeight: '900' },
});
