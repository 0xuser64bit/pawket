import { Ionicons } from '@expo/vector-icons';
import { PassportEventType } from '@pawket/shared';
import { router } from 'expo-router';
import { type ComponentProps, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, SectionHeader, StateBlock, Surface } from '../src/components/DesignSystem';
import { FadeInUp, Skeleton } from '../src/components/Motion';
import { MessageBanner } from '../src/components/MessageBanner';
import { PetCreature } from '../src/components/PetCreature';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { colors, spacing } from '../src/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

function label(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function shorten(value?: string) {
  if (!value) return 'No key';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

const eventVisual = (type: PassportEventType): { icon: IconName } => {
  if (type === PassportEventType.LevelUp) return { icon: 'trending-up' };
  if (type === PassportEventType.DailyReward) return { icon: 'gift' };
  if (type === PassportEventType.Adopted) return { icon: 'paw' };
  return { icon: 'leaf' };
};

function Fact({ label: l, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text variant="meta" tone="faint">
        {l}
      </Text>
      <Text variant="label" tone="text" selectable>
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

  return (
    <Screen nav>
      <FadeInUp>
        <Text variant="title" tone="text" numberOfLines={1}>
          {pet ? `${pet.name}'s passport` : 'Passport'}
        </Text>
        <Text variant="body" tone="muted" style={styles.lead}>
          A record of the days you spent together.
        </Text>
      </FadeInUp>

      <MessageBanner tone="error" message={error} />

      {pet ? (
        <FadeInUp delay={50}>
          <Surface style={styles.book}>
            <View style={styles.bookHead}>
              <PetCreature species={pet.species} mood={label(pet.mood)} size={72} />
              <View style={styles.flex}>
                <Text variant="h1" tone="text">
                  {pet.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {label(pet.species)} · {label(pet.personality)}
                </Text>
              </View>
            </View>
            <View style={styles.facts}>
              <Fact label="Level" value={`${pet.level}`} />
              <Fact label="Adopted" value={new Date(pet.createdAt).toLocaleDateString()} />
              <Fact label="Memories" value={`${passportEvents.length}`} />
              <Fact label="Owner" value={shorten(wallet?.address ?? pet.ownerWalletAddress)} />
            </View>
          </Surface>
        </FadeInUp>
      ) : (
        <StateBlock
          title="No passport yet"
          copy="Adopt a companion to begin a record."
          icon="book-outline"
        />
      )}

      {pet ? (
        <FadeInUp delay={90}>
          <SectionHeader
            title="Memories"
            action={
              status === 'loading_passport' ? <ActivityIndicator color={colors.accent} /> : undefined
            }
          />
        </FadeInUp>
      ) : null}

      {status === 'loading_passport' && passportEvents.length === 0 ? (
        <View style={styles.timeline}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.event}>
              <Skeleton width={72} height={12} />
              <Skeleton width="70%" height={18} />
              <Skeleton width="100%" height={14} />
            </View>
          ))}
        </View>
      ) : !pet ? null : passportEvents.length === 0 ? (
        <StateBlock
          title="No memories yet"
          copy="Care for your companion to write the first page."
          icon="book-outline"
          action={
            <Button
              label="Go care"
              onPress={() => router.push('/home')}
              tone="ghost"
              size="md"
              full={false}
            />
          }
        />
      ) : (
        <View style={styles.timeline}>
          {passportEvents.map((event, index) => {
            const v = eventVisual(event.type);
            return (
              <FadeInUp key={event.id} delay={Math.min(index * 40, 240)}>
                <View style={styles.event}>
                  <View style={styles.eventMeta}>
                    <Ionicons color={colors.accent} name={v.icon} size={14} />
                    <Text variant="meta" tone="faint">
                      {new Date(event.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text variant="h3" tone="text">
                    {event.title}
                  </Text>
                  {event.description ? (
                    <Text variant="body" tone="muted">
                      {event.description}
                    </Text>
                  ) : null}
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
  lead: { marginTop: spacing.xs },
  flex: { flex: 1 },
  book: { gap: spacing.lg },
  bookHead: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fact: { flexBasis: '45%', flexGrow: 1, gap: 4 },
  timeline: { gap: 0 },
  event: {
    borderColor: colors.border,
    borderTopWidth: 1,
    gap: 4,
    paddingVertical: spacing.md,
  },
  eventMeta: { alignItems: 'center', flexDirection: 'row', gap: 6 },
});
