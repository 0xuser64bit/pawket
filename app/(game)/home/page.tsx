import type { Metadata } from "next";
import { HomeScreen } from "@/components/home/home-screen";

export const metadata: Metadata = { title: "Home" };

/**
 * Home is a place, not a dashboard. The order is the room, then care, then
 * anything that explains it — and nothing is drawn over the animal.
 */
export default function HomePage() {
  return <HomeScreen />;
}
