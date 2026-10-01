import "server-only";

import { Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { ImageResponse } from "next/og";
import { PetArt, type PetForm } from "@/components/pk/art";
import { DAYLIGHT } from "@/components/room3d/palette";
import { PERSONALITY_LABEL, SPECIES_ART, SPECIES_LABEL } from "@/lib/game/appearance";
import { calculateLevelFromXp } from "@/lib/game/math";
import type { PetOnChain } from "@/lib/solana/accounts";

/**
 * Pictures of a pet for outside the app: the card a shared link unfurls as
 * (`wide`, 1200×630) and the icon of a Solana Action (`square`). Drawn from
 * the record at request time; without a pet, the three species together.
 */

/** A coat in hex: the card is drawn without a stylesheet, so no token resolves. */
const COAT: Record<PetForm, [string, string]> = {
  cat: [DAYLIGHT.sun, DAYLIGHT["sun-edge"]],
  dog: [DAYLIGHT["trim-copper"], DAYLIGHT["trim-cloth"]],
  bird: [DAYLIGHT.pool, DAYLIGHT["pool-edge"]],
  bun: [DAYLIGHT.bloom, DAYLIGHT["bloom-edge"]],
};
const SKY: Record<PetForm, string> = {
  cat: DAYLIGHT["sun-soft"],
  dog: DAYLIGHT["surface-sunk"],
  bird: DAYLIGHT["pool-soft"],
  bun: DAYLIGHT["pool-soft"],
};

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

function petImage(form: PetForm): string {
  const svg = markup(
    <PetArt form={form} coat={COAT[form][0]} patch={COAT[form][1]} rim still colours={{ ink: DAYLIGHT.edge, rim: DAYLIGHT.surface }} />,
  ).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function Pocket({ form, size }: { form: PetForm; size: number }) {
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
        background: SKY[form],
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- drawn into a PNG, not a page */}
      <img src={petImage(form)} width={size - 12} height={size - 12} alt="" />
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
            <Pocket form={SPECIES_ART[onChain.pet.species]} size={420} />
          ) : (
            <div style={{ display: "flex", gap: 28 }}>
              {(["cat", "dog", "bun"] as const).map((form) => (
                <Pocket key={form} form={form} size={200} />
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
            {(["cat", "dog", "bun"] as const).map((form) => (
              <Pocket key={form} form={form} size={230} />
            ))}
          </div>
          <div style={{ fontFamily: "Fraunces", fontSize: 92, lineHeight: 1, marginTop: 8 }}>Pawket</div>
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
        <Pocket form={SPECIES_ART[onChain.pet.species]} size={440} />
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
