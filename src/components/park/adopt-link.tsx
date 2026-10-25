"use client";

import { ShareButton } from "@/components/pet/share-button";

export function AdoptLink({ url }: { url: string }) {
  return <ShareButton name="Adopt a companion" label="Share adoption link" url={url} text="Meet your little companion on Pawket. Adopt for free and bring them home." />;
}
