import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { GlassPanel, Pill, SectionHeader } from '../src/components/DesignSystem';
import { Screen } from '../src/components/Screen';
import { pawketApiBaseUrl } from '../src/api/client';
import { solanaConfig } from '../src/solana/config';
import { usePawketSession } from '../src/state/PawketSessionContext';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

function shorten(value?: string) {
  if (!value) return 'Not connected';
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function SettingsRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons color={colors.cyan} name={icon} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text selectable style={styles.rowValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { wallet, pet, status } = usePawketSession();
  return (
    <Screen nav>
      <Pill tone="green">Devnet controls</Pill>
      <Text style={styles.title}>Settings without the debug dump.</Text>
      <Text style={styles.copy}>
        A clean view of the current demo stack, wallet mode, and cluster. No secrets are stored in
        the mobile client.
      </Text>

      <GlassPanel style={styles.panel}>
        <SectionHeader eyebrow="session" title="Companion session" />
        <SettingsRow icon="wallet-outline" label="Wallet" value={shorten(wallet?.address)} />
        <SettingsRow
          icon="paw-outline"
          label="Active pet"
          value={pet ? `${pet.name} · level ${pet.level}` : 'No companion adopted'}
        />
        <SettingsRow icon="pulse-outline" label="Runtime status" value={status} />
      </GlassPanel>

      <GlassPanel style={styles.panel}>
        <SectionHeader eyebrow="network" title="Solana/dev mode" />
        <SettingsRow icon="git-network-outline" label="Cluster" value={solanaConfig.cluster} />
        <SettingsRow icon="cube-outline" label="Program" value={shorten(solanaConfig.programId)} />
        <SettingsRow icon="radio-outline" label="RPC" value={shorten(solanaConfig.rpcUrl)} />
      </GlassPanel>

      <GlassPanel style={styles.panel}>
        <SectionHeader eyebrow="api" title="Service path" />
        <SettingsRow icon="server-outline" label="API base" value={pawketApiBaseUrl} />
        <SettingsRow icon="phone-portrait-outline" label="App version" value="0.1.0 demo" />
        <Text style={styles.disclaimer}>
          Reset/dev tools are not exposed here because the current vertical slice does not provide a
          safe mobile reset action.
        </Text>
      </GlassPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textSoft },
  panel: { gap: spacing.md },
  row: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderColor: 'rgba(34,211,238,0.32)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  rowLabel: { ...typography.micro, color: colors.faint, textTransform: 'uppercase' },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 3 },
  disclaimer: { color: colors.muted, lineHeight: 20 },
});
