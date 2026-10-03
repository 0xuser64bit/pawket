import { redirect } from "next/navigation";

/** The shelf moved into the profile; an old link still lands on it. */
export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(tab === "wardrobe" ? "/profile?tab=wardrobe#shelf" : "/profile#shelf");
}
