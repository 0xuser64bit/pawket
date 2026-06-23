/**
 * Pawket design tokens.
 *
 * One source of truth for color, type, spacing, radius, elevation and motion.
 * Screens and components must consume these tokens instead of raw values so the
 * product stays coherent as it grows.
 */

export const colors = {
  // Structural — deep, near-black with a cool undertone.
  void: '#04050B',
  bg: '#06070F',
  bgElevated: '#0A0C18',
  base: '#06070F',
  raised: '#0C0F1E',
  card: '#0C0F1E',
  cardSoft: '#11142A',

  // Glass surfaces (translucent fills layered over the dark base).
  surface: 'rgba(255,255,255,0.040)',
  surfaceStrong: 'rgba(255,255,255,0.072)',
  surfaceMuted: 'rgba(255,255,255,0.022)',
  glass: 'rgba(255,255,255,0.05)',
  glassHi: 'rgba(255,255,255,0.14)', // top-edge highlight that sells the glass
  glassLo: 'rgba(6,7,15,0.66)',
  scrim: 'rgba(3,4,9,0.72)',

  // Hairlines.
  border: 'rgba(255,255,255,0.085)',
  borderStrong: 'rgba(255,255,255,0.16)',
  line: 'rgba(255,255,255,0.07)',

  // Text.
  text: '#F5F7FF',
  textSoft: '#CED4EE',
  muted: '#9097B6',
  faint: '#5A6182',

  // Accents — Solana energy, used as light not as flood.
  solanaPurple: '#9B6BFF',
  solanaPurpleDeep: '#6E4BFF',
  solanaGreen: '#17E589',
  mint: '#41F0C7',
  cyan: '#2BD4F5',
  blue: '#5C8BFF',
  magenta: '#FF66D4',
  amber: '#FFB04D',
  gold: '#FFD36E',

  // Semantic.
  danger: '#FF6480',
  success: '#22E59A',
  warning: '#FFC24B',

  black: '#04050B',
  white: '#FFFFFF',
} as const;

export const gradients = {
  // Cinematic app backdrop.
  app: ['#04050B', '#070A18', '#0C0822', '#04050B'] as const,
  chamber: ['rgba(43,212,245,0.16)', 'rgba(155,107,255,0.18)', 'rgba(23,229,137,0.06)'] as const,
  // CTA + accent gradients.
  primary: ['#17E589', '#2BD4F5', '#9B6BFF'] as const,
  green: ['#17E589', '#2BD4F5'] as const,
  purple: ['#A98BFF', '#6E4BFF'] as const,
  magenta: ['#FF7ADC', '#9B6BFF'] as const,
  cyan: ['#5FE3FF', '#3AA9FF'] as const,
  amber: ['#FFD36E', '#FF8A4C'] as const,
  danger: ['#FF6480', '#FF8FA3'] as const,
  // Glass fills (top→bottom).
  glass: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.028)'] as const,
  glassRaised: ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.04)'] as const,
} as const;

/** Per-species creature/aura gradients (kept here so the pet stays on-brand). */
export const speciesGradient = {
  luna_cat: ['#BD9BFF', '#7E5BFF'] as const,
  moss_pup: ['#52F2A8', '#13C77E'] as const,
  cloud_bun: ['#6FE6FF', '#3AA9FF'] as const,
} as const;

export const speciesAccent = {
  luna_cat: colors.solanaPurple,
  moss_pup: colors.solanaGreen,
  cloud_bun: colors.cyan,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
  pill: 999,
} as const;

/**
 * Font family names exported by @expo-google-fonts. The family name carries the
 * weight on native, so components pick a family rather than setting fontWeight.
 */
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displaySemibold: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.4 },
  title: { fontFamily: fonts.display, fontSize: 33, lineHeight: 36, letterSpacing: -1.1 },
  h1: { fontFamily: fonts.display, fontSize: 27, lineHeight: 31, letterSpacing: -0.7 },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.displaySemibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  stat: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, letterSpacing: -0.6 },
  bodyLg: { fontFamily: fonts.body, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.7,
    textTransform: 'uppercase' as const,
  },
  // Backwards-compatible alias used by older code paths.
  micro: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.7,
    textTransform: 'uppercase' as const,
  },
} as const;

/**
 * Shadows use the CSS `boxShadow` style prop (New Architecture), not legacy
 * `shadowColor`/`elevation` — those render muddy or not at all on device and
 * flatten a glow-dependent aesthetic. Each value is a single `boxShadow` style.
 */
export const shadows = {
  // Neutral elevation scale.
  e1: { boxShadow: '0px 6px 10px rgba(0,0,0,0.22)' },
  e2: { boxShadow: '0px 12px 22px rgba(0,0,0,0.34)' },
  e3: { boxShadow: '0px 20px 36px rgba(0,0,0,0.48)' },
  panel: { boxShadow: '0px 12px 22px rgba(0,0,0,0.36)' },
  // Colored glows (symmetric, no offset).
  glowGreen: { boxShadow: '0px 0px 26px rgba(23,229,137,0.50)' },
  glowPurple: { boxShadow: '0px 0px 30px rgba(155,107,255,0.55)' },
  glowCyan: { boxShadow: '0px 0px 26px rgba(43,212,245,0.50)' },
  glowAmber: { boxShadow: '0px 0px 24px rgba(255,176,77,0.48)' },
} as const;

/** Animation timing (ms) + spring config, shared so motion feels unified. */
export const motion = {
  fast: 140,
  base: 220,
  slow: 360,
  breathe: 3400,
  pulse: 2600,
  float: 4200,
  spring: { damping: 14, stiffness: 160, mass: 0.9 },
} as const;

export const layout = {
  screenPadding: 20,
  maxContent: 520, // keep content readable on web/tablet
  navHeight: 66,
} as const;

/**
 * Responsive scaling. The type scale and pet chamber are tuned for the capped
 * ~520px web/tablet column; on a full-bleed phone (~390pt) the same sizes are
 * oversized and push primary actions below the fold. These helpers shrink the
 * largest display type and the chamber on narrow viewports while leaving the
 * web/tablet experience untouched.
 */
export const TYPE_FULL_WIDTH = 480;

/** Down-scales large display type on narrow phones; 1.0 on web/tablet. */
export function headingScale(width: number) {
  if (width >= TYPE_FULL_WIDTH) return 1;
  return Math.max(0.8, Math.min(1, width / 430));
}

/** True for phone-width viewports, where the chamber should be more compact. */
export function isCompactWidth(width: number) {
  return width < 420;
}

export type GradientName = keyof typeof gradients;
export type SpeciesKey = keyof typeof speciesGradient;
