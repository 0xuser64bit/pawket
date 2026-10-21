import { Crest } from "@/components/pk";
import { CREST_COLOURS, CREST_GLYPHS } from "@/lib/guilds/guild";

export function GuildCrest({ crest, colour, name, size }: { crest: number; colour: number; name: string; size?: "sm" | "lg" }) {
  const hue = CREST_COLOURS[colour] ?? CREST_COLOURS[0];
  return <Crest name={name} glyph={CREST_GLYPHS[crest] ?? "paw"} color={hue.token} on={hue.on} size={size} />;
}
