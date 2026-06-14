export const colors = {
  ink: '#03040a',
  bg: '#05060d',
  bgElevated: '#090b15',
  surface: 'rgba(255,255,255,0.045)',
  surfaceStrong: 'rgba(255,255,255,0.075)',
  surfaceMuted: 'rgba(255,255,255,0.026)',
  glass: 'rgba(13,17,32,0.82)',
  card: '#0d1020',
  cardSoft: '#13172a',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#f7f8ff',
  textSoft: '#d7dcf0',
  muted: '#8d95b3',
  faint: '#59617d',
  solanaPurple: '#8b5cf6',
  solanaGreen: '#14f195',
  cyan: '#22d3ee',
  magenta: '#ff4fd8',
  amber: '#fbbf24',
  danger: '#ff5f7a',
  success: '#2af6a5',
  warning: '#ffd166',
  black: '#02030a',
  white: '#ffffff',
} as const;

export const gradients = {
  app: ['#03040a', '#070817', '#100a24', '#03040a'] as const,
  chamber: ['rgba(34,211,238,0.18)', 'rgba(139,92,246,0.18)', 'rgba(20,241,149,0.08)'] as const,
  primary: ['#14f195', '#22d3ee', '#8b5cf6'] as const,
  purple: ['#a855f7', '#6366f1'] as const,
  green: ['#14f195', '#22d3ee'] as const,
  magenta: ['#ff4fd8', '#8b5cf6'] as const,
  amber: ['#fbbf24', '#ff7a59'] as const,
  glass: ['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.035)'] as const,
  danger: ['#ff5f7a', '#fb7185'] as const,
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
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 38, lineHeight: 42, fontWeight: '900' as const, letterSpacing: -0.8 },
  h1: { fontSize: 32, lineHeight: 36, fontWeight: '900' as const, letterSpacing: -0.6 },
  h2: { fontSize: 24, lineHeight: 29, fontWeight: '900' as const, letterSpacing: -0.25 },
  h3: { fontSize: 18, lineHeight: 23, fontWeight: '800' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '900' as const, letterSpacing: 1.3 },
} as const;

export const shadows = {
  glowGreen: {
    shadowColor: colors.solanaGreen,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  glowPurple: {
    shadowColor: colors.solanaPurple,
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  panel: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
} as const;
