import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Divider, SectionHeader, Surface } from '../src/components/DesignSystem';
import { FadeInUp } from '../src/components/Motion';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { notifyWarning, tapMedium } from '../src/feedback/haptics';
import { pawketApiBaseUrl } from '../src/api/client';
import { solanaConfig } from '../src/solana/config';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { colors, radius, spacing } from '../src/theme/tokens';

function shorten(value?: string) {
  if (!value) return 'Not connected';
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="meta" tone="faint">
        {label}
      </Text>
      <Text variant={mono ? 'mono' : 'label'} tone="text" selectable style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { wallet, pet, disconnect, startOver } = usePawketSession();
  const [confirmReset, setConfirmReset] = useState(false);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const handleStartOver = () => {
    if (!confirmReset) {
      notifyWarning();
      setConfirmReset(true);
      return;
    }
    void startOver();
  };

  return (
    <Screen>
      <FadeInUp>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            onPress={goBack}
            style={styles.back}
          >
            <Ionicons color={colors.textSoft} name="chevron-back" size={20} />
          </Pressable>
          <Text variant="title" tone="text" style={styles.title}>
            Settings
          </Text>
        </View>
        <Text variant="body" tone="muted">
          Your companion key lives on this device. No account. No seed phrase.
        </Text>
      </FadeInUp>

      <FadeInUp delay={50}>
        <Surface style={styles.panel}>
          <SectionHeader title="This device" />
          <Row label="Companion key" mono value={shorten(wallet?.address)} />
          <Divider />
          <Row
            label="Active pet"
            value={pet ? `${pet.name} · level ${pet.level}` : 'No companion adopted'}
          />
        </Surface>
      </FadeInUp>

      <FadeInUp delay={100}>
        <Surface style={styles.panel}>
          <SectionHeader title="Network" />
          <Row label="Cluster" value={solanaConfig.cluster} />
          <Divider />
          <Row label="Program" mono value={shorten(solanaConfig.programId)} />
          <Divider />
          <Row label="RPC" mono value={shorten(solanaConfig.rpcUrl)} />
          <Divider />
          <Row label="API" mono value={pawketApiBaseUrl} />
        </Surface>
      </FadeInUp>

      <FadeInUp delay={150}>
        <Surface style={styles.panel}>
          <SectionHeader title="Companion key" />
          <Button
            icon="log-out-outline"
            label="Disconnect"
            tone="ghost"
            size="md"
            onPress={() => {
              tapMedium();
              void disconnect();
            }}
          />
          <Text variant="caption" tone="muted">
            Ends this session but keeps the key. Reconnect to return to{' '}
            {pet ? pet.name : 'your pet'}.
          </Text>
          <Divider />
          <Button
            icon={confirmReset ? 'warning-outline' : 'refresh-outline'}
            label={confirmReset ? 'Tap again to erase this key' : 'Start over'}
            tone={confirmReset ? 'danger' : 'ghost'}
            size="md"
            onPress={handleStartOver}
          />
          <Text variant="caption" tone={confirmReset ? 'danger' : 'muted'}>
            Erases the key on this device and makes a new identity.{' '}
            {pet ? `${pet.name} and its` : 'Your'} passport cannot be recovered without the original
            key.
          </Text>
        </Surface>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  back: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: { flex: 1 },
  panel: { gap: spacing.sm },
  row: { gap: 4, paddingVertical: 6 },
  value: { marginTop: 2 },
});
