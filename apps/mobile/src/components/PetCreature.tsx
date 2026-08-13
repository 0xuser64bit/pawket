import type { PetSpecies } from '@pawket/shared';
import { useEffect, useState } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { speciesGradient } from '../theme/tokens';

type SpeciesKey = keyof typeof speciesGradient;

type Expression = {
  eyeOpen: number; // 0..1
  mouth: 'wide' | 'smile' | 'flat' | 'frown' | 'o' | 'cat';
  blush: boolean;
  sparkle: boolean;
};

const EXPRESSIONS: Record<string, Expression> = {
  radiant: { eyeOpen: 1, mouth: 'wide', blush: true, sparkle: true },
  happy: { eyeOpen: 1, mouth: 'smile', blush: true, sparkle: false },
  okay: { eyeOpen: 0.9, mouth: 'flat', blush: false, sparkle: false },
  hungry: { eyeOpen: 0.95, mouth: 'o', blush: false, sparkle: false },
  lonely: { eyeOpen: 0.7, mouth: 'frown', blush: false, sparkle: false },
  tired: { eyeOpen: 0.32, mouth: 'flat', blush: false, sparkle: false },
  scruffy: { eyeOpen: 0.8, mouth: 'flat', blush: false, sparkle: false },
};

function resolveSpecies(species?: PetSpecies | string): SpeciesKey {
  if (species === 'moss_pup') return 'moss_pup';
  if (species === 'cloud_bun') return 'cloud_bun';
  return 'luna_cat';
}

function resolveExpression(mood?: string): Expression {
  const key = (mood ?? 'happy').toLowerCase();
  return EXPRESSIONS[key] ?? EXPRESSIONS.happy!;
}

const EYE_DARK = '#1A1410';

/** Species-specific ears, drawn behind the body so they connect cleanly. */
function Ears({ species, fill }: { species: SpeciesKey; fill: string }) {
  if (species === 'moss_pup') {
    // Floppy droop ears down the sides.
    return (
      <G>
        <Path d="M30 30 C14 26 11 48 22 58 C32 60 36 44 36 34 Z" fill={fill} opacity={0.96} />
        <Path d="M70 30 C86 26 89 48 78 58 C68 60 64 44 64 34 Z" fill={fill} opacity={0.96} />
      </G>
    );
  }
  if (species === 'cloud_bun') {
    // Tall rounded bunny ears.
    return (
      <G>
        <Ellipse cx={38} cy={16} rx={7} ry={20} fill={fill} transform="rotate(-10 38 16)" />
        <Ellipse cx={62} cy={16} rx={7} ry={20} fill={fill} transform="rotate(10 62 16)" />
        <Ellipse
          cx={38}
          cy={18}
          rx={3}
          ry={13}
          fill="#FFFFFF"
          opacity={0.25}
          transform="rotate(-10 38 18)"
        />
        <Ellipse
          cx={62}
          cy={18}
          rx={3}
          ry={13}
          fill="#FFFFFF"
          opacity={0.25}
          transform="rotate(10 62 18)"
        />
      </G>
    );
  }
  // Luna cat: pointed triangular ears.
  return (
    <G>
      <Path d="M30 32 L23 8 L45 26 Z" fill={fill} />
      <Path d="M70 32 L77 8 L55 26 Z" fill={fill} />
      <Path d="M31 28 L27 14 L40 25 Z" fill="#FFFFFF" opacity={0.22} />
      <Path d="M69 28 L73 14 L60 25 Z" fill="#FFFFFF" opacity={0.22} />
    </G>
  );
}

function Mouth({ kind }: { kind: Expression['mouth'] }) {
  switch (kind) {
    case 'wide':
      return <Path d="M41 66 Q50 78 59 66 Z" fill={EYE_DARK} />;
    case 'smile':
      return (
        <Path
          d="M43 67 Q50 74 57 67"
          stroke={EYE_DARK}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'frown':
      return (
        <Path
          d="M44 72 Q50 67 56 72"
          stroke={EYE_DARK}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'o':
      return <Ellipse cx={50} cy={70} rx={3} ry={4} fill={EYE_DARK} />;
    case 'cat':
      return (
        <Path
          d="M44 69 Q47 72 50 69 Q53 72 56 69"
          stroke={EYE_DARK}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'flat':
    default:
      return (
        <Path
          d="M45 70 L55 70"
          stroke={EYE_DARK}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        />
      );
  }
}

function Eye({ cx, open }: { cx: number; open: number }) {
  // Closed-ish eyes render as a soft curved lid; open eyes as glossy ovals.
  if (open < 0.3) {
    return (
      <Path
        d={`M${cx - 6} 51 Q${cx} 56 ${cx + 6} 51`}
        stroke={EYE_DARK}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  const ry = 9 * open;
  return (
    <G>
      <Ellipse cx={cx} cy={50} rx={6.2} ry={ry} fill={EYE_DARK} />
      <Circle cx={cx + 2.2} cy={50 - ry * 0.45} r={2} fill="#FFFFFF" />
      <Circle cx={cx - 1.8} cy={50 + ry * 0.3} r={1} fill="#FFFFFF" opacity={0.7} />
    </G>
  );
}

/**
 * The Pawket companion, drawn entirely in SVG so it stays crisp at any size and
 * varies by species + mood. Breathing/float are applied by the parent chamber.
 */
export function PetCreature({
  species,
  mood,
  size = 200,
}: {
  species?: PetSpecies | string;
  mood?: string;
  size?: number;
}) {
  const key = resolveSpecies(species);
  const expr = resolveExpression(mood);
  const [from, to] = speciesGradient[key];
  const reduced = useReducedMotion();
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduced) return;
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 130);
          schedule();
        },
        2600 + Math.random() * 2600,
      );
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [reduced]);

  const eyeOpen = blink ? 0.08 : expr.eyeOpen;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
        <RadialGradient id="aura" cx="50%" cy="46%" r="55%">
          <Stop offset="0" stopColor={from} stopOpacity={0.45} />
          <Stop offset="0.6" stopColor={from} stopOpacity={0.12} />
          <Stop offset="1" stopColor={from} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="gloss" cx="40%" cy="30%" r="60%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.05} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Soft aura glow */}
      <Circle cx={50} cy={52} r={48} fill="url(#aura)" />

      {/* Ears behind body */}
      <Ears species={key} fill={to} />

      {/* Body */}
      <Ellipse cx={50} cy={56} rx={31} ry={30} fill="url(#body)" />
      {/* Belly + gloss for dimension */}
      <Ellipse cx={50} cy={64} rx={20} ry={16} fill="#FFFFFF" opacity={0.09} />
      <Ellipse cx={50} cy={50} rx={31} ry={30} fill="url(#gloss)" />
      {/* Rim light */}
      <Path
        d="M24 44 Q34 26 50 25 Q66 26 76 44"
        stroke="#FFFFFF"
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.28}
        fill="none"
      />

      {/* Cheeks */}
      {expr.blush ? (
        <G>
          <Ellipse cx={31} cy={60} rx={5} ry={3} fill="#E8A07A" opacity={0.55} />
          <Ellipse cx={69} cy={60} rx={5} ry={3} fill="#E8A07A" opacity={0.55} />
        </G>
      ) : null}

      {/* Face */}
      <Eye cx={37} open={eyeOpen} />
      <Eye cx={63} open={eyeOpen} />
      <Mouth kind={expr.mouth} />

      {/* Sparkles */}
      {expr.sparkle ? (
        <G fill="#FFFFFF">
          <Path
            d="M18 26 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z"
            opacity={0.9}
          />
          <Path
            d="M82 32 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2 Z"
            opacity={0.8}
          />
          <Circle cx={80} cy={66} r={1.6} opacity={0.7} />
        </G>
      ) : null}
    </Svg>
  );
}
