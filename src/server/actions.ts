import "server-only";

import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";
import { PERSONALITY_LABEL, SPECIES_LABEL } from "@/lib/game/appearance";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { CLUSTER_CAIP2 } from "@/lib/solana/cluster";

export const ACTION_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Action-Version, X-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": "2.4",
  "X-Blockchain-Ids": CLUSTER_CAIP2[getPublicEnv().solanaCluster],
};

export function actionJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: ACTION_HEADERS });
}

export function actionError(message: string, status = 400) {
  return actionJson({ message }, status);
}

export function preflight() {
  return new Response(null, { status: 204, headers: ACTION_HEADERS });
}

export function absolute(request: Request, path: string): string {
  return new URL(path, request.url).toString();
}

export async function postedAccount(request: Request): Promise<string | null> {
  const body = (await request.json().catch(() => null)) as { account?: unknown } | null;
  return typeof body?.account === "string" ? body.account : null;
}

/** An address a proxy wrote, or null when it is not one. IPv6 is keyed by its /64. */
function addressKey(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(value);
  if (mapped) return addressKey(mapped[1]);
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
  if (v4) {
    const octets = v4.slice(1).map(Number);
    return octets.every((octet) => octet <= 255) ? octets.join(".") : null;
  }
  if (!value.includes(":")) return null;
  const ip = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  if (ip.includes("%")) return null;
  const halves = ip.toLowerCase().split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if ([...left, ...right].some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  const missing = 8 - left.length - right.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...left, ...Array<string>(missing).fill("0"), ...right].map((group) => parseInt(group, 16).toString(16));
  return `${groups.slice(0, 4).join(":")}::/64`;
}

export function caller(request: Request): string {
  const real = addressKey(request.headers.get("x-real-ip"));
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",") ?? [];
  for (let i = forwarded.length - 1; i >= 0; i--) {
    const key = addressKey(forwarded[i]);
    if (key) return key;
  }
  return "local";
}

export function adoptLinkedAction(label = "Adopt") {
  return {
    type: "transaction" as const,
    label,
    href: "/api/actions/adopt?species={species}&personality={personality}&name={name}",
    parameters: [
      {
        type: "select" as const,
        name: "species",
        label: "Who is coming home?",
        required: true,
        options: Object.values(PetSpecies).map((value) => ({ label: SPECIES_LABEL[value], value })),
      },
      {
        type: "select" as const,
        name: "personality",
        label: "How would you describe them?",
        required: true,
        options: Object.values(PetPersonality).map((value) => ({ label: PERSONALITY_LABEL[value], value })),
      },
      {
        type: "text" as const,
        name: "name",
        label: "Their name, 2 to 24 characters",
        required: true,
      },
    ],
  };
}

