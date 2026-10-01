import { isAddress } from "@solana/kit";
import { petCard, WIDE } from "@/server/card";
import { readPet } from "@/server/solana";

export const alt = "A pet kept on Solana, in Pawket";
export const size = WIDE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return petCard(isAddress(id) ? await readPet(id).catch(() => null) : null, "wide");
}
