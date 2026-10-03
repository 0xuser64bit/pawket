import type { Metadata } from "next";
import { ProfileScreen, type ProfileTab } from "@/components/profile/profile-screen";

export const metadata: Metadata = { title: "Profile" };

const TABS: ProfileTab[] = ["pets", "wardrobe", "stickers", "settings"];

/** You, your look and everything you keep. Read in the browser: it all lives on this device or in a wallet. */
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <ProfileScreen tab={TABS.includes(tab as ProfileTab) ? (tab as ProfileTab) : "pets"} />;
}
