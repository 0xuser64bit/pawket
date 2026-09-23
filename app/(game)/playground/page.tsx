import type { Metadata } from "next";
import { PlaygroundScreen } from "@/components/play/playground-screen";

export const metadata: Metadata = { title: "Playground" };

/** One round, played as the pet saved in this browser. */
export default function PlaygroundPage() {
  return <PlaygroundScreen />;
}
