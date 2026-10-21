import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { Screen, Waiting } from "@/components/pk";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <Suspense fallback={<Screen><Waiting label="Opening your profile" /></Screen>}><ProfileScreen /></Suspense>;
}
