import type { Metadata } from "next";
import { InventoryScreen } from "@/components/inventory/inventory-screen";

export const metadata: Metadata = { title: "Inventory" };

/** The shelf. The pet and the wardrobe are read in the browser. */
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <InventoryScreen tab={tab === "wardrobe" ? "wardrobe" : "pet"} />;
}
