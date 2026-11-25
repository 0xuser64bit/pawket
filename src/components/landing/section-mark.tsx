import type { ReactNode } from "react";
import { PawArt } from "@/components/pk";

export function SectionMark({
  n,
  children,
  tone = "sun",
}: {
  n: string;
  children: ReactNode;
  tone?: "sun" | "sprout" | "pool" | "bloom";
}) {
  return (
    <p className="pk-sectionmark" data-tone={tone}>
      <span className="pk-sectionmark__n">{n}</span>
      <span className="pk-sectionmark__paw" aria-hidden="true">
        <PawArt form="heart" />
      </span>
      <span className="pk-sectionmark__label">{children}</span>
    </p>
  );
}
