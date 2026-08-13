/**
 * Pawket design tokens.
 *
 * Nightlight companion: a warm room after dark, one lamp, one living thing.
 * Screens and components consume these tokens. Do not hardcode hex or sizes.
 */

export const colors = {
  // Structural — warm umber night, never cool void.
  bg: '#16110E',
  bgElevated: '#1E1814',
  surface: '#261F1A',
  surfaceRaised: '#2E261F',
  surfaceMuted: '#201A16',

  // Hairlines on warm dark. Always keep borderWidth stable; only swap color.
  border: 'rgba(244, 233, 216, 0.10)',
  borderStrong: 'rgba(244, 233, 216, 0.18)',
  borderAccent: 'rgba(227, 155, 74, 0.55)',

  // Text — warm paper, not cool white.
  text: '#F4E9D8',
  textSoft: '#D4C4AE',
  muted: '#A08C76',
  faint: '#746354',

  // The lamp. One accent for the whole product.
  accent: '#E39B4A',
  accentHover: '#EFB05F',
  accentMuted: 'rgba(227, 155, 74, 0.16)',
  accentInk: '#1A120C',

  // Semantic. Dusty, not neon.
  success: '#7FA37A',
  successMuted: 'rgba(127, 163, 122, 0.12)',
  successLine: 'rgba(127, 163, 122, 0.32)',
  warning: '#D4A056',
  warningMuted: 'rgba(212, 160, 86, 0.12)',
  warningLine: 'rgba(212, 160, 86, 0.36)',
  danger: '#C45D4A',
  dangerMuted: 'rgba(196, 93, 74, 0.14)',
  dangerLine: 'rgba(196, 93, 74, 0.40)',
  info: '#8A9BB0',

  // Overlays.
  scrim: 'rgba(14, 10, 8, 0.72)',
  lamp: 'rgba(227, 155, 74, 0.10)',

  // Inverse ink (on honey buttons, on chips).
  inverse: '#1A120C',
  white: '#F4E9D8',
  black: '#1A120C',
} as const;

export const gradients = {
  // Barely-there night depth. Not a mesh, not a rainbow.
  app: ['#1A1410', '#14100D'] as const,
  chamber: ['#2C2118', '#1A1410'] as const,
  primary: [colors.accentHover, colors.accent] as const,
} as const;

/** Creature paint only. Never used as UI chrome. */
export const speciesGradient = {
  luna_cat: ['#C9B0D4', '#8E739C'] as const,
  moss_pup: ['#8AAD78', '#5A7A52'] as const,
  cloud_bun: ['#B5C9C8', '#6E8888'] as const,
} as const;

export const speciesAccent = {
  luna_cat: '#B89AC6',
  moss_pup: '#7FA37A',
  cloud_bun: '#8AA8A8',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Font family names exported by @expo-google-fonts. The family name carries the
 * weight on native, so components pick a family rather than setting fontWeight.
 */
export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displaySemibold: 'BricolageGrotesque_600SemiBold',
  displayMedium: 'BricolageGrotesque_500Medium',
  body: 'NunitoSans_400Regular',
  bodyMedium: 'NunitoSans_500Medium',
  bodySemibold: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.displaySemibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.displaySemibold, fontSize: 17, lineHeight: 22, letterSpacing: 0 },
  stat: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.4 },
  bodyLg: { fontFamily: fonts.body, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 15, lineHeight: 20, letterSpacing: 0 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  meta: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  mono: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  // Quiet alias. Not an uppercase tracking stamp.
  eyebrow: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  micro: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
} as const;

/**
 * Shadows use the CSS `boxShadow` style prop (New Architecture).
 * Warm-tinted, no colored neon glow except the chamber lamp.
 */
export const shadows = {
  e1: { boxShadow: '0px 4px 12px rgba(20, 12, 8, 0.28)' },
  e2: { boxShadow: '0px 10px 24px rgba(20, 12, 8, 0.36)' },
  e3: { boxShadow: '0px 16px 36px rgba(20, 12, 8, 0.44)' },
  lamp: { boxShadow: '0px 12px 40px rgba(227, 155, 74, 0.16)' },
} as const;

export const motion = {
  fast: 140,
  base: 220,
  slow: 320,
  breathe: 3600,
  pulse: 2800,
  float: 4400,
  spring: { damping: 16, stiffness: 170, mass: 0.9 },
} as const;

export const layout = {
  screenPadding: 20,
  maxContent: 520,
  navHeight: 64,
} as const;

export const TYPE_FULL_WIDTH = 480;

export function headingScale(width: number) {
  if (width >= TYPE_FULL_WIDTH) return 1;
  return Math.max(0.84, Math.min(1, width / 430));
}

export function isCompactWidth(width: number) {
  return width < 420;
}

export type GradientName = keyof typeof gradients;
export type SpeciesKey = keyof typeof speciesGradient;
