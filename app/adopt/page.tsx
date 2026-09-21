import type { Metadata } from "next";
import { AdoptFlow } from "@/components/adopt/adopt-flow";

export const metadata: Metadata = {
  title: "Adopt a pet",
  description: "Pick a pet, name it, take it home. No wallet, no token, no connect step.",
};

/**
 * Onboarding carries no Dock: there is nowhere else to be yet, and the
 * animal is the largest thing on every one of these three screens.
 */
export default function AdoptPage() {
  return <AdoptFlow />;
}
