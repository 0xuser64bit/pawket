import { petCard, WIDE } from "@/server/card";

export const alt = "Pawket — a luna cat, a moss pup and a cloud bun";
export const size = WIDE;
export const contentType = "image/png";

export default function Image() {
  return petCard(null, "wide");
}
