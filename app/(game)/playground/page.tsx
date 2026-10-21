import type { Metadata } from "next";
import { PlaygroundScreen } from "@/components/play/playground-screen";

export const metadata: Metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return <PlaygroundScreen />;
}
