import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, radius } from '../theme/tokens';

/** Pawket wordmark: a quiet paw mark + the name. */
export function BrandMark({ pill }: { pill?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        <Ionicons color={colors.accentInk} name="paw" size={18} />
      </View>
      <Text variant="h2" tone="text" style={styles.name}>
        Pawket
      </Text>
      {pill ? (
        <Text variant="meta" tone="muted">
          {pill}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  name: { flex: 1, letterSpacing: -0.4 },
});
