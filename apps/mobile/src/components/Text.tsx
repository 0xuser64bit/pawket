import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors, typography } from '../theme/tokens';

type Variant = keyof typeof typography;

type Tone =
  | 'text'
  | 'soft'
  | 'muted'
  | 'faint'
  | 'green'
  | 'purple'
  | 'cyan'
  | 'amber'
  | 'magenta'
  | 'mint'
  | 'blue'
  | 'gold'
  | 'danger'
  | 'white'
  | 'black';

const toneColor: Record<Tone, string> = {
  text: colors.text,
  soft: colors.textSoft,
  muted: colors.muted,
  faint: colors.faint,
  green: colors.solanaGreen,
  purple: colors.solanaPurple,
  cyan: colors.cyan,
  amber: colors.amber,
  magenta: colors.magenta,
  mint: colors.mint,
  blue: colors.blue,
  gold: colors.gold,
  danger: colors.danger,
  white: colors.white,
  black: colors.black,
};

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
};

/**
 * Single typographic primitive. Pick a `variant` from the type scale and a
 * semantic `tone` instead of hand-rolling font sizes/weights per screen.
 */
export function Text({ variant = 'body', tone = 'soft', align, style, ...rest }: TextProps) {
  return (
    <RNText
      style={[
        typography[variant],
        { color: toneColor[tone] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
