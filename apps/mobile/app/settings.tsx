import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Divider,
  GlassPanel,
  IconTile,
  Pill,
  SectionHeader,
} from '../src/components/DesignSystem';
import { FadeInUp } from '../src/components/Motion';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { notifyWarning, tapMedium } from '../src/feedback/haptics';
import { pawketApiBaseUrl } from '../src/api/client';
import { solanaConfig } from '../src/solana/config';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { colors, radius, spacing } from '../src/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'green' | 'purple' | 'cyan' | 'amber';

function shorten(value?: string) {
  if (!value) return 'Not connected';
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function Row({
  label,
  value,
  icon,
  tone = 'cyan',
  mono = false,
}: {
  label: string;
  value: string;
  icon: IconName;
  tone?: Tone;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <IconTile icon={icon} tone={tone} size={40} />
      <View style={styles.flex}>
        <Text variant="micro" tone="faint">
          {label}
        </Text>
        <Text variant={mono ? 'mono' : 'label'} tone="text" selectable style={styles.value}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { wallet, pet, status, disconnect, startOver } = usePawketSession();
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
          <Pill tone="green">Devnet</Pill>
        </View>
        <Text variant="title" tone="text" style={styles.title}>
          Settings.
        </Text>
        <Text variant="body" tone="soft">
          Your companion key lives on this device. Your pet and Passport belong to it — no account,
          no seed phrase.
        </Text>
      </FadeInUp>

      <FadeInUp delay={70}>
        <GlassPanel style={styles.panel}>
          <SectionHeader eyebrow="session" title="Companion session" tone="green" />
          <Row
            icon="key-outline"
            label="Companion key"
            tone="green"
            mono
            value={shorten(wallet?.address)}
          />
          <Divider />
          <Row
            icon="paw-outline"
            label="Active pet"
            tone="purple"
            value={pet ? `${pet.name} · level ${pet.level}` : 'No companion adopted'}
          />
          <Divider />
          <Row icon="pulse-outline" label="Runtime status" tone="cyan" value={status} />
        </GlassPanel>
      </FadeInUp>

      <FadeInUp delay={130}>
        <GlassPanel style={styles.panel}>
          <SectionHeader eyebrow="network" title="Solana / dev mode" tone="cyan" />
          <Row
            icon="git-network-outline"
            label="Cluster"
            tone="cyan"
            value={solanaConfig.cluster}
          />
          <Divider />
          <Row
            icon="cube-outline"
            label="Program"
            tone="purple"
            mono
            value={shorten(solanaConfig.programId)}
          />
          <Divider />
          <Row
            icon="radio-outline"
            label="RPC"
            tone="green"
            mono
            value={shorten(solanaConfig.rpcUrl)}
          />
        </GlassPanel>
      </FadeInUp>

      <FadeInUp delay={190}>
        <GlassPanel style={styles.panel}>
          <SectionHeader eyebrow="service" title="App path" tone="amber" />
          <Row icon="server-outline" label="API base" tone="amber" mono value={pawketApiBaseUrl} />
          <Divider />
          <Row icon="phone-portrait-outline" label="App version" tone="green" value="0.1.0" />
        </GlassPanel>
      </FadeInUp>

      <FadeInUp delay={250}>
        <GlassPanel style={styles.panel}>
          <SectionHeader eyebrow="this device" title="Companion key" tone="purple" />
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
            Ends this session but keeps your key — reconnect to return to{' '}
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
            Erases the key on this device and mints a fresh identity.{' '}
            {pet ? `${pet.name} and its` : 'Your'} Passport can’t be recovered without the original
            key.
          </Text>
        </GlassPanel>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  back: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: { marginTop: spacing.md, marginBottom: 6 },
  panel: { gap: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingVertical: 4 },
  value: { marginTop: 3 },
  note: { marginTop: spacing.xs },
});
