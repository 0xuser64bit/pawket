import type { Metadata } from "next";
import { AdoptFlow } from "@/components/adopt/adopt-flow";

export const metadata: Metadata = {
  title: "Adopt a pet",
  description: "Pick a pet, name it, take it home. No wallet, no token, no connect step.",
};

export default function AdoptPage() {
  return <AdoptFlow />;
}
