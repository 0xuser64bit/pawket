import { Button } from './DesignSystem';

export function PrimaryButton({
  label,
  onPress,
  tone = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?:
    | 'primary'
    | 'pink'
    | 'mint'
    | 'violet'
    | 'green'
    | 'purple'
    | 'magenta'
    | 'amber'
    | 'ghost'
    | 'danger';
  disabled?: boolean;
}) {
  const mappedTone =
    tone === 'pink' ? 'magenta' : tone === 'mint' ? 'green' : tone === 'violet' ? 'purple' : tone;
  return <Button disabled={disabled} label={label} onPress={onPress} tone={mappedTone} />;
}
