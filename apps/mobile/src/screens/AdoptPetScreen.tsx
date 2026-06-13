import { StyleSheet, Text } from 'react-native';
import { PetAvatar } from '../components/PetAvatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { colors } from '../theme/tokens';
export function AdoptPetScreen({ onAdopted }: { onAdopted: () => void }) {
  return (
    <Screen>
      <Text style={styles.title}>Meet Nova</Text>
      <PetAvatar mood="Curious" />
      <Text style={styles.copy}>
        A Luna Cat with a curious heart. This local demo pet keeps UI development honest until the
        devnet adoption transaction is wired.
      </Text>
      <PrimaryButton label="Adopt Nova" onPress={onAdopted} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 38, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24 },
});
