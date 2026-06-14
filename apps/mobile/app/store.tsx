import { PlaceholderScreen } from '../src/screens/PlaceholderScreen';
export default function StoreScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Pawket market"
      title="Store drops are charging."
      icon="diamond-outline"
      copy="Cosmetics, premium eggs, seasonal passes, and item bundles will unlock after verified SOL/USDC payment intents are production-ready."
      previews={[
        {
          title: 'Cosmetic drops',
          copy: 'Aura trails, habitat skins, and expressive pet accessories.',
          icon: 'sparkles-outline',
          tone: 'purple',
        },
        {
          title: 'Premium eggs',
          copy: 'Limited companion variants with transparent supply mechanics.',
          icon: 'egg-outline',
          tone: 'green',
        },
        {
          title: 'Season passes',
          copy: 'Event memories, quests, and rewards without fake production claims.',
          icon: 'ticket-outline',
          tone: 'amber',
        },
      ]}
    />
  );
}
