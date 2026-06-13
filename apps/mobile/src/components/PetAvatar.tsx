import { StyleSheet, Text, View } from 'react-native';
export function PetAvatar({ mood = 'Radiant' }: { mood?: string }) {
  return (
    <View style={styles.orb}>
      <Text style={styles.face}>ᓚᘏᗢ</Text>
      <Text style={styles.mood}>{mood}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  orb: {
    height: 190,
    borderRadius: 40,
    backgroundColor: '#211b35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#463a70',
  },
  face: { fontSize: 68 },
  mood: { color: '#ffd166', fontWeight: '700', marginTop: 10 },
});
