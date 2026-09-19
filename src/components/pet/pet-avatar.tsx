import {
  PetMood,
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";

interface PetAvatarProps {
  species: PetSpecies;
  personality: PetPersonality;
  mood: PetMood;
  name: string;
  size?: number;
}

const BODY: Record<PetSpecies, { main: string; belly: string; glow: string }> = {
  [PetSpecies.LunaCat]: { main: "#8b7cf6", belly: "#cfc6ff", glow: "#b7aaff" },
  [PetSpecies.MossPup]: { main: "#4caf7d", belly: "#c9ecd9", glow: "#8fd9ae" },
  [PetSpecies.CloudBun]: { main: "#5aa9e6", belly: "#d8ecfd", glow: "#9fd0f5" },
};

function Ears({ species, main }: { species: PetSpecies; main: string }) {
  if (species === PetSpecies.LunaCat) {
    return (
      <g>
        <polygon points="52,38 44,12 68,30" fill={main} />
        <polygon points="108,38 116,12 92,30" fill={main} />
        <polygon points="54,32 50,20 62,28" fill="#2b2350" opacity="0.55" />
        <polygon points="106,32 110,20 98,28" fill="#2b2350" opacity="0.55" />
      </g>
    );
  }
  if (species === PetSpecies.MossPup) {
    return (
      <g>
        <ellipse cx="38" cy="58" rx="12" ry="22" fill={main} transform="rotate(24 38 58)" />
        <ellipse cx="122" cy="58" rx="12" ry="22" fill={main} transform="rotate(-24 122 58)" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="58" cy="18" rx="10" ry="26" fill={main} />
      <ellipse cx="102" cy="18" rx="10" ry="26" fill={main} />
      <ellipse cx="58" cy="20" rx="5" ry="17" fill="#2b2350" opacity="0.35" />
      <ellipse cx="102" cy="20" rx="5" ry="17" fill="#2b2350" opacity="0.35" />
    </g>
  );
}

function Eyes({ mood }: { mood: PetMood }) {
  const ink = "#241f3d";
  switch (mood) {
    case PetMood.Radiant:
      return (
        <g stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M56 74 q8 -10 16 0" />
          <path d="M88 74 q8 -10 16 0" />
        </g>
      );
    case PetMood.Happy:
      return (
        <g fill={ink}>
          <ellipse cx="64" cy="72" rx="6" ry="8" />
          <ellipse cx="96" cy="72" rx="6" ry="8" />
          <circle cx="66" cy="69" r="2" fill="#fff" />
          <circle cx="98" cy="69" r="2" fill="#fff" />
        </g>
      );
    case PetMood.Tired:
      return (
        <g stroke={ink} strokeWidth="4" strokeLinecap="round">
          <line x1="56" y1="74" x2="72" y2="74" />
          <line x1="88" y1="74" x2="104" y2="74" />
        </g>
      );
    case PetMood.Hungry:
      return (
        <g fill={ink}>
          <ellipse cx="64" cy="76" rx="5" ry="7" />
          <ellipse cx="96" cy="76" rx="5" ry="7" />
        </g>
      );
    case PetMood.Lonely:
      return (
        <g>
          <circle cx="64" cy="74" r="5" fill={ink} />
          <circle cx="96" cy="74" r="5" fill={ink} />
          <circle cx="104" cy="82" r="2.5" fill="#9fd0f5" />
        </g>
      );
    case PetMood.Scruffy:
      return (
        <g fill={ink}>
          <circle cx="64" cy="72" r="5" />
          <circle cx="96" cy="72" r="5" />
        </g>
      );
    default:
      return (
        <g fill={ink}>
          <circle cx="64" cy="72" r="5.5" />
          <circle cx="96" cy="72" r="5.5" />
          <circle cx="66" cy="70" r="1.8" fill="#fff" />
          <circle cx="98" cy="70" r="1.8" fill="#fff" />
        </g>
      );
  }
}

function PersonalityMark({
  personality,
  glow,
}: {
  personality: PetPersonality;
  glow: string;
}) {
  switch (personality) {
    case PetPersonality.Curious:
      return (
        <path
          d="M80 34 l2.2 5.4 5.4 2.2 -5.4 2.2 -2.2 5.4 -2.2 -5.4 -5.4 -2.2 5.4 -2.2 Z"
          fill={glow}
        />
      );
    case PetPersonality.Cozy:
      return (
        <g fill={glow} opacity="0.9">
          <ellipse cx="52" cy="84" rx="7" ry="4.5" />
          <ellipse cx="108" cy="84" rx="7" ry="4.5" />
        </g>
      );
    case PetPersonality.Brave:
      return (
        <path d="M68 44 h24 l-4 8 h-16 Z" fill={glow} opacity="0.9" />
      );
    default:
      return (
        <path
          d="M64 84 q16 10 32 0"
          stroke={glow}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      );
  }
}

/**
 * Deterministic companion portrait: same (species, personality, mood) always
 * renders the same SVG. Pure Server Component — no wallet, no effects.
 */
export function PetAvatar({ species, personality, mood, name, size = 160 }: PetAvatarProps) {
  const { main, belly, glow } = BODY[species];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role="img"
      aria-label={`${name}, feeling ${mood}`}
    >
      <ellipse cx="80" cy="146" rx="44" ry="8" fill="#000" opacity="0.35" />
      <Ears species={species} main={main} />
      <ellipse cx="80" cy="92" rx="46" ry="52" fill={main} />
      <ellipse cx="80" cy="110" rx="26" ry="30" fill={belly} opacity="0.85" />
      {mood === PetMood.Scruffy ? (
        <g stroke="#241f3d" strokeWidth="2.5" strokeLinecap="round" opacity="0.6">
          <path d="M44 60 l8 6 -8 6" fill="none" />
          <path d="M116 60 l-8 6 8 6" fill="none" />
        </g>
      ) : null}
      <Eyes mood={mood} />
      <ellipse cx="80" cy="88" rx="4" ry="3" fill="#241f3d" />
      {mood === PetMood.Hungry ? (
        <ellipse cx="80" cy="100" rx="7" ry="8" fill="#241f3d" opacity="0.8" />
      ) : (
        <path
          d="M72 96 q8 6 16 0"
          stroke="#241f3d"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      )}
      <PersonalityMark personality={personality} glow={glow} />
    </svg>
  );
}
