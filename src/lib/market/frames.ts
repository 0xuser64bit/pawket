/** Photo frames are expression only; their numbered entitlements live in the Solana closet. */
export const PHOTO_FRAMES = [
  { id: "postcard", item: 80, name: "Postcard", line: "A double ink border, like a note from home." },
  { id: "film", item: 81, name: "Film strip", line: "Dark edges and little sprocket holes." },
  { id: "garden", item: 82, name: "Garden", line: "Sprout ink and flowers around the two of you." },
  { id: "sunshine", item: 83, name: "Sunshine", line: "A warm sun border for a day worth keeping." },
  { id: "polaroid", item: 84, name: "Instant", line: "Square corners and a strip of tape, like an instant print." },
  { id: "hearts", item: 85, name: "Hearts", line: "Blush hearts at every corner." },
  { id: "starry", item: 86, name: "Starry night", line: "A deep blue border full of gold stars." },
  { id: "confetti", item: 87, name: "Confetti", line: "A little party thrown around the edges." },
] as const;

export type PhotoFrameId = (typeof PHOTO_FRAMES)[number]["id"];
