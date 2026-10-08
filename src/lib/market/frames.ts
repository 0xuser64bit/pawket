/** Photo frames are expression only; their numbered entitlements live in the Solana closet. */
export const PHOTO_FRAMES = [
  { id: "postcard", item: 80, name: "Postcard", line: "A double ink border, like a note from home." },
  { id: "film", item: 81, name: "Film strip", line: "Dark edges and little sprocket holes." },
  { id: "garden", item: 82, name: "Garden", line: "Sprout ink and flowers around the two of you." },
  { id: "sunshine", item: 83, name: "Sunshine", line: "A warm sun border for a day worth keeping." },
] as const;

export type PhotoFrameId = (typeof PHOTO_FRAMES)[number]["id"];
