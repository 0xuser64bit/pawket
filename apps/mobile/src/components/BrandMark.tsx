import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Pill } from './DesignSystem';
import { Text } from './Text';
import { colors, gradients, radius } from '../theme/tokens';

/** Pawket wordmark: gradient paw mark + name, with an optional context pill. */
export function BrandMark({ pill }: { pill?: string }) {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mark}
      >
        <Ionicons color={colors.black} name="paw" size={20} />
      </LinearGradient>
      <Text variant="h2" tone="text" style={styles.name}>
        Pawket
      </Text>
      {pill ? (
        <Pill tone="purple" icon="ellipse">
          {pill}
        </Pill>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  mark: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  name: { flex: 1, letterSpacing: -0.5 },
});
