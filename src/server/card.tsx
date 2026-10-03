import "server-only";

import { Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { ImageResponse } from "next/og";
import { PawGlyph } from "@/components/pk/art";
import { PetArt, type PetForm, type PetPaint } from "@/components/pk/pet-art";
import { DAYLIGHT, type Tone } from "@/components/room3d/palette";
import { PERSONALITY_LABEL, SPECIES_LABEL, petLook } from "@/lib/game/appearance";
import { calculateLevelFromXp } from "@/lib/game/math";
import { projectGuestPet } from "@/lib/guest/pet";
import { toCompanionRecord, type ChainGuild, type PetOnChain } from "@/lib/solana/accounts";
import { iconPath } from "@/components/pk/icon";
import { CREST_COLOURS, CREST_GLYPHS } from "@/lib/guilds/guild";

/**
 * Pictures of a pet for outside the app: the card a shared link unfurls as
 * (`wide`, 1200×630) and the icon of a Solana Action (`square`). Drawn from
 * the record at request time; without a pet, the three species together.
 */

/** The pet's paint in hex: the card is drawn without a stylesheet, so no token resolves. */
const PAINT: PetPaint = {
  ink: DAYLIGHT.edge,
  rim: DAYLIGHT.surface,
  coat: "",
  patch: "",
  eye: DAYLIGHT["pet-eye"],
  shine: DAYLIGHT["pet-shine"],
  blush: DAYLIGHT["pet-blush"],
  cream: DAYLIGHT["pet-cream"],
  cocoa: DAYLIGHT["pet-cocoa"],
  cloud: DAYLIGHT["pet-cloud"],
  cloudShade: DAYLIGHT["pet-cloud-shade"],
  pool: DAYLIGHT.pool,
  poolEdge: DAYLIGHT["pool-edge"],
  sun: DAYLIGHT.sun,
  sunEdge: DAYLIGHT["sun-edge"],
  sprout: DAYLIGHT.sprout,
  sproutEdge: DAYLIGHT["sprout-edge"],
  foil: DAYLIGHT["trim-foil"],
  glass: DAYLIGHT["trim-glass"],
  surface: DAYLIGHT.surface,
};
const COAT: Record<PetForm, [string, string]> = {
  cat: [DAYLIGHT.sun, DAYLIGHT["sun-edge"]],
  dog: [DAYLIGHT["trim-copper"], DAYLIGHT["pet-cocoa"]],
  bun: [DAYLIGHT["pet-cloud"], DAYLIGHT["pet-cloud-shade"]],
};
const SKY: Record<PetForm, string> = {
  cat: DAYLIGHT["sun-soft"],
  dog: DAYLIGHT["surface-sunk"],
  bun: DAYLIGHT["pool-soft"],
};

type Look = Omit<ReturnType<typeof petLook>, "seed">;
const SPECIES_LOOKS: Look[] = [
  { form: "cat", temper: "curious", feeling: "happy", wearing: null },
  { form: "dog", temper: "brave", feeling: "happy", wearing: "wool-scarf" },
  { form: "bun", temper: "cozy", feeling: "happy", wearing: null },
];

/** How this pet looks right now, from its record. */
function lookOf(onChain: PetOnChain): Look {
  const record = toCompanionRecord(onChain);
  const { form, temper, feeling, wearing } = petLook(record, projectGuestPet(record).mood);
  return { form, temper, feeling, wearing };
}

let fonts: Promise<Array<{ name: string; data: ArrayBuffer; weight: 500 | 700 }>> | null = null;

/** The brand's faces as TTF (the renderer reads no WOFF2), fetched once; none if the fetch fails. */
function brandFonts() {
  fonts ??= (async () => {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Fraunces:wght@700&family=Hanken+Grotesk:wght@500",
    ).then((r) => r.text());
    const urls = [...css.matchAll(/src: url\((.+?\.ttf)\)/g)].map((m) => m[1]);
    const [display, text] = await Promise.all(urls.slice(0, 2).map((url) => fetch(url).then((r) => r.arrayBuffer())));
    return [
      { name: "Fraunces", data: display, weight: 700 as const },
      { name: "Hanken Grotesk", data: text, weight: 500 as const },
    ];
  })().catch(() => []);
  return fonts;
}

const escape = (value: string) => value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
/** SVG keeps these two in camelCase; every other prop is an attribute in kebab-case. */
const attribute = (prop: string) =>
  prop === "className" ? "class" : prop === "viewBox" || prop === "preserveAspectRatio" ? prop : prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * PetArt as an SVG string. The renderer cannot draw fragments and no page
 * renderer may be imported here, so this serialises the drawing's own
 * element tree — plain SVG, no hooks.
 */
function markup(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return escape(String(node));
  if (Array.isArray(node)) return node.map(markup).join("");
  if (!isValidElement(node)) return "";
  const element = node as ReactElement<Record<string, unknown> & { children?: ReactNode }>;
  if (element.type === Fragment) return markup(element.props.children);
  if (typeof element.type === "function") {
    return markup((element.type as (props: unknown) => ReactNode)(element.props));
  }
  const attrs = Object.entries(element.props)
    .filter(([key, value]) => key !== "children" && value != null && value !== false && typeof value !== "function")
    .map(([key, value]) => ` ${attribute(key)}="${escape(String(value))}"`)
    .join("");
  return `<${String(element.type)}${attrs}>${markup(element.props.children)}</${String(element.type)}>`;
}

function petImage(look: Look): string {
  const svg = markup(
    <PetArt {...look} coat={COAT[look.form][0]} patch={COAT[look.form][1]} rim still colours={PAINT} />,
  ).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** The mark at a size, as an image the renderer can place: tokens resolve to their Daylight hex. */
function pawImage(size: number): string {
  const svg = markup(<PawGlyph size={size} />)
    .replace(/var\(--([a-z-]+)\)/g, (_, token: string) => DAYLIGHT[token as Tone])
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Pawket's own icon, for a home screen: the paw at its fullest — shelf and highlights — on a `sun-soft` square. */
export function pawIcon(size: number): ImageResponse {
  const glyph = Math.round(size * 0.66);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: DAYLIGHT["sun-soft"] }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn into a PNG, not a page */}
        <img src={pawImage(glyph)} width={glyph} height={glyph} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}

function Pocket({ look, size }: { look: Look; size: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size * 0.145,
        border: `${Math.round(size / 72)}px solid ${DAYLIGHT.edge}`,
        boxShadow: `${Math.round(size / 44)}px ${Math.round(size / 44)}px 0 ${DAYLIGHT.edge}`,
        background: SKY[look.form],
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- drawn into a PNG, not a page */}
      <img src={petImage(look)} width={size - 12} height={size - 12} alt="" />
    </div>
  );
}

function facts(onChain: PetOnChain): string[] {
  const { pet, passport } = onChain;
  return [
    `${SPECIES_LABEL[pet.species]} · ${PERSONALITY_LABEL[pet.personality]}`,
    `Level ${calculateLevelFromXp(pet.xp)} · ${passport.careCount} ${passport.careCount === 1 ? "care" : "cares"} · best run ${passport.bestStreak} ${passport.bestStreak === 1 ? "day" : "days"}`,
  ];
}

const mark = (text: string, fontSize: number) => (
  <div
    style={{
      display: "flex",
      padding: `${fontSize * 0.38}px ${fontSize * 0.77}px`,
      border: `3px solid ${DAYLIGHT["pool-edge"]}`,
      borderRadius: 14,
      background: DAYLIGHT["pool-soft"],
      color: DAYLIGHT["pool-edge"],
      fontSize,
      letterSpacing: 2,
    }}
  >
    {text}
  </div>
);

export const WIDE = { width: 1200, height: 630 };
export const SQUARE = { width: 800, height: 800 };

export async function petCard(onChain: PetOnChain | null, shape: "wide" | "square"): Promise<ImageResponse> {
  const options = { ...(shape === "wide" ? WIDE : SQUARE), fonts: await brandFonts() };
  const base = {
    display: "flex",
    width: "100%",
    height: "100%",
    background: DAYLIGHT.ground,
    color: DAYLIGHT.edge,
    fontFamily: "Hanken Grotesk",
  } as const;
  const name = onChain?.pet.name ?? "Pawket";
  const lines = onChain ? facts(onChain) : ["A living companion", "Adopt one, care for it, keep it on Solana"];

  if (shape === "square") {
    return new ImageResponse(
      (
        <div style={{ ...base, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
          {onChain ? (
            <Pocket look={lookOf(onChain)} size={420} />
          ) : (
            <div style={{ display: "flex", gap: 28 }}>
              {SPECIES_LOOKS.map((look) => (
                <Pocket key={look.form} look={look} size={200} />
              ))}
            </div>
          )}
          <div style={{ fontFamily: "Fraunces", fontSize: name.length > 12 ? 64 : 84, lineHeight: 1 }}>{name}</div>
          <div style={{ fontSize: 30, color: DAYLIGHT["trim-cloth"] }}>{lines[onChain ? 1 : 0]}</div>
          {mark(onChain ? "ON SOLANA · PAWKET" : "ON SOLANA DEVNET", 24)}
        </div>
      ),
      options,
    );
  }

  if (!onChain) {
    return new ImageResponse(
      (
        <div style={{ ...base, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
          <div style={{ display: "flex", gap: 36 }}>
            {SPECIES_LOOKS.map((look) => (
              <Pocket key={look.form} look={look} size={230} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- drawn into a PNG, not a page */}
            <img src={pawImage(112)} width={112} height={112} alt="" />
            <div style={{ fontFamily: "Fraunces", fontSize: 92, lineHeight: 1 }}>Pawket</div>
          </div>
          <div style={{ fontSize: 32, color: DAYLIGHT["trim-cloth"] }}>
            A living companion. Adopt one, care for it, keep it on Solana.
          </div>
        </div>
      ),
      options,
    );
  }

  return new ImageResponse(
    (
      <div style={{ ...base, alignItems: "center", padding: 72 }}>
        <Pocket look={lookOf(onChain)} size={440} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 64, gap: 20 }}>
          <div style={{ fontFamily: "Fraunces", fontSize: name.length > 12 ? 72 : 104, lineHeight: 1 }}>{name}</div>
          {lines.map((line) => (
            <div key={line} style={{ fontSize: 34, color: DAYLIGHT["trim-cloth"] }}>
              {line}
            </div>
          ))}
          <div style={{ display: "flex", marginTop: 20 }}>{mark("ON SOLANA · PAWKET", 26)}</div>
        </div>
      </div>
    ),
    options,
  );
}

/** A crest's fill and ink, as the Daylight values a PNG needs. */
const CREST_TONE: Record<(typeof CREST_COLOURS)[number]["id"], [Tone, Tone]> = {
  bloom: ["bloom", "ink-inverse"],
  pool: ["pool", "on-sun"],
  sprout: ["sprout", "on-sun"],
  sun: ["sun", "on-sun"],
  copper: ["trim-copper", "ink-inverse"],
  glass: ["trim-glass", "ink-inverse"],
};

/** A guild's square card: its crest, its name and motto, and how many pets are in it. */
export async function guildCard(guild: ChainGuild): Promise<ImageResponse> {
  const [fill, on] = CREST_TONE[CREST_COLOURS[guild.colour]?.id ?? "bloom"];
  const glyph = CREST_GLYPHS[guild.crest] ?? "paw";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="220" height="220" fill="none" stroke="${DAYLIGHT[on]}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPath(glyph)}"/></svg>`;
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          width: "100%",
          height: "100%",
          background: DAYLIGHT.ground,
          color: DAYLIGHT.edge,
          fontFamily: "Hanken Grotesk",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 300,
            height: 330,
            background: DAYLIGHT[fill],
            border: `10px solid ${DAYLIGHT[on]}`,
            borderRadius: "34px 34px 46% 46%",
            boxShadow: `12px 12px 0 ${DAYLIGHT.edge}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- drawn into a PNG, not a page */}
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} width={220} height={220} alt="" />
        </div>
        <div style={{ fontFamily: "Fraunces", fontSize: guild.name.length > 16 ? 60 : 80, lineHeight: 1 }}>{guild.name}</div>
        {guild.motto ? <div style={{ fontSize: 30, color: DAYLIGHT["trim-cloth"], maxWidth: 680, textAlign: "center" }}>{guild.motto}</div> : null}
        {mark(`${guild.memberCount} ${guild.memberCount === 1 ? "PET" : "PETS"} · A GUILD ON SOLANA`, 24)}
      </div>
    ),
    { ...SQUARE, fonts: await brandFonts() },
  );
}
