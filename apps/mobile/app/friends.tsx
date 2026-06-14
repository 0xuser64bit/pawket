import { PlaceholderScreen } from '../src/screens/PlaceholderScreen';
export default function FriendsScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Social layer"
      title="Visit companions soon."
      icon="people-outline"
      tone="cyan"
      copy="Friends will let players visit habitats, gift care items, and complete social quests with visible companion identity."
      previews={[
        {
          title: 'Visit companions',
          copy: 'Browse public Pet Passports and active moods.',
          icon: 'planet-outline',
          tone: 'cyan',
        },
        {
          title: 'Gift items',
          copy: 'Send care boosts and cosmetics through safe wallet flows.',
          icon: 'gift-outline',
          tone: 'green',
        },
        {
          title: 'Social quests',
          copy: 'Cooperative weekly rituals for Season One communities.',
          icon: 'people-circle-outline',
          tone: 'purple',
        },
      ]}
    />
  );
}
