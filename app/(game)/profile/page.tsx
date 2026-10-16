import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { Screen, Waiting } from "@/components/pk";

export const metadata: Metadata = { title: "Profile" };

/** You, your look and everything you keep. Read in the browser: it all lives on this device or in a wallet. */
export default function ProfilePage() {
  return <Suspense fallback={<Screen><Waiting label="Opening your profile" /></Screen>}><ProfileScreen /></Suspense>;
}
