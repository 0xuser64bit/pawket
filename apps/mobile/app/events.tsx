import { PlaceholderScreen } from '../src/screens/PlaceholderScreen';
export default function EventsScreen() {
  return (
    <PlaceholderScreen
      eyebrow="Season One"
      title="The first season is forming."
      icon="flash-outline"
      tone="amber"
      copy="Seasonal events will add daily challenges, community goals, limited memories, and progression loops that make Pawket worth opening every day."
      previews={[
        {
          title: 'Daily challenges',
          copy: 'Small rituals tuned for fast mobile sessions.',
          icon: 'calendar-outline',
          tone: 'green',
        },
        {
          title: 'Community goals',
          copy: 'Shared milestones that unlock global habitat energy.',
          icon: 'radio-outline',
          tone: 'cyan',
        },
        {
          title: 'Limited memories',
          copy: 'Season-specific Passport entries and collectible moments.',
          icon: 'bookmarks-outline',
          tone: 'amber',
        },
      ]}
    />
  );
}
