export interface NewsEntry {
  date: string;
  title: string;
  body: string;
  href?: string;
  see?: string;
}

export const NEWS: readonly NewsEntry[] = [
  {
    date: "2026-10-23",
    title: "They missed you",
    body: "Come back after a few hours and your pet bounces over to say hello, with a word on how long it has been and what they need.",
    href: "/home",
    see: "Go home",
  },
  {
    date: "2026-10-23",
    title: "Still home when the signal drops",
    body: "Lose the connection and Pawket stays open: your pets here still work, and a place that needs the connection waits and opens by itself once you are back.",
    href: "/home",
    see: "Go home",
  },
  {
    date: "2026-10-21",
    title: "Autumn in the room",
    body: "A bat garland, a pumpkin lantern that grins after dark and a heap of leaves, all free and marked new for a month, and a witch's hat for you. Until November, leaves drift past the window.",
    href: "/market#decor",
    see: "See the room's things",
  },
  {
    date: "2026-10-21",
    title: "Boop",
    body: "Tap your pet in either room, 3D or flat: it hops, beams and plays a little tune of its own.",
    href: "/home",
    see: "Go home",
  },
  {
    date: "2026-10-21",
    title: "Shelves to swipe",
    body: "On a phone each Market shelf is a row to swipe, with the whole shelf a tap away; a search for halloween finds the autumn things.",
    href: "/market",
    see: "Open the Market",
  },
  {
    date: "2026-10-21",
    title: "Guilds, shared",
    body: "A guild's link unfurls as its crest and motto, and an address nobody has founded offers itself by name.",
    href: "/guilds",
    see: "See the guilds",
  },
  {
    date: "2026-10-20",
    title: "Three new emotes",
    body: "Heart, Peace and Nice, each with its own tune, and each a pose for a photo of the two of you.",
    href: "/home",
    see: "Go home",
  },
  {
    date: "2026-10-20",
    title: "Hats and glasses for you",
    body: "A hair bow, cat ears, headphones and star glasses. A pet in the nap ribbon, headphones or sunglasses can now be matched.",
    href: "/profile#look",
    see: "Change your look",
  },
  {
    date: "2026-10-20",
    title: "Coats",
    body: "Five coats for each kind of pet, chosen at adoption and changed any time in the wardrobe.",
    href: "/adopt",
    see: "Adopt a pet",
  },
  {
    date: "2026-10-20",
    title: "The room's things",
    body: "Pictures, plants, rugs, beds and more, placed from Home. Most are free; each Market room brings one of its own.",
    href: "/market#decor",
    see: "See the room's things",
  },
  {
    date: "2026-10-20",
    title: "A keepsake worth keeping",
    body: "A pet's card in your wallet is a proper collectible now: its portrait, level, cares and best run, read from its record.",
  },
  {
    date: "2026-10-20",
    title: "Shared with a picture",
    body: "Sharing a pet's record sends its card along with the link.",
  },
  {
    date: "2026-10-20",
    title: "Phone wallets that answer",
    body: "Linking a phone wallet no longer waits forever in Phantom or Solflare: an old approval is renewed, and a stalled request can be stopped.",
  },
  {
    date: "2026-10-20",
    title: "Search the Market",
    body: "Find anything by name, colour or where it is worn, and narrow the shelves to hats, rooms, frames or what you own.",
    href: "/market",
    see: "Open the Market",
  },
];
