import type { Metadata } from "next";
import { PetScreen } from "@/components/pet/pet-screen";

export const metadata: Metadata = { title: "Pet" };

/** The record. The id is checked in the browser, where the pet is saved. */
export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PetScreen id={id} />;
}
