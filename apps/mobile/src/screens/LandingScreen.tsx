import { StyleSheet, View } from 'react-native';
import { Button } from '../components/DesignSystem';
import { BrandMark } from '../components/BrandMark';
import { FadeInUp } from '../components/Motion';
import { PetChamber } from '../components/PetChamber';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { tapMedium } from '../feedback/haptics';
import { spacing } from '../theme/tokens';

export function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <Screen>
      <FadeInUp>
        <BrandMark />
      </FadeInUp>

      <FadeInUp delay={50}>
        <PetChamber mood="Radiant" />
      </FadeInUp>

      <FadeInUp delay={110}>
        <View style={styles.copy}>
          <Text variant="display" tone="text">
            A companion that remembers you.
          </Text>
          <Text variant="bodyLg" tone="muted">
            Adopt one pet. Care for it in small daily rituals. Keep a passport of the days you spent
            together.
          </Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={170}>
        <Button
          icon="paw"
          label="Meet your companion"
          onPress={() => {
            tapMedium();
            onStart();
          }}
        />
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { gap: spacing.sm },
});
