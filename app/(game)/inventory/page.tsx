import { redirect } from "next/navigation";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(tab === "wardrobe" ? "/profile?tab=wardrobe#shelf" : "/profile#shelf");
}
