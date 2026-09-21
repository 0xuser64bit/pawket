import type { ReceiptRow, Stage } from "@/components/pk";

/** Demo fixtures — see the note in `./pets.ts`. */

export interface DemoGuild {
  slug: string;
  name: string;
  letter: string;
  /** Only for a guild with approved branding. The outline stays on-bloom. */
  color?: string;
  members: string;
  stage: Stage;
  stageLabel: string;
  blurb: string;
  summary: string;
  official: boolean;
  /** The precise unverified sentence, when "not checked" is not precise enough. */
  markLabel?: string;
  joined: boolean;
  /** What the token does, and where it stops. Published and reviewed. */
  utility?: string;
  reviewed?: string;
  token?: {
    symbol: string;
    /** Participation toward a published threshold. Never a price. */
    launch: { value: number; max: number; readout: string };
    allocation: ReceiptRow[];
    treasury: { rows: ReceiptRow[]; note: string; indexed: string };
    quote: {
      payAmount: string;
      payAsset: string;
      receiveAmount: string;
      receiveAsset: string;
      rows: ReceiptRow[];
      total: { k: string; v: string };
      note: string;
      validFor: string;
    };
  };
  events: Array<{ name: string; when: string; note: string; open: boolean }>;
  policy: string[];
}

export const DEMO_GUILDS: DemoGuild[] = [
  {
    slug: "clover",
    name: "Clover Guild",
    letter: "C",
    members: "4,812",
    stage: "dbc",
    stageLabel: "Launch open",
    blurb: "Weekly meadow races and monthly cosmetic votes.",
    summary:
      "Weekly meadow races, a shared spring backdrop, and a monthly vote on the next cosmetic drop.",
    official: true,
    joined: false,
    utility:
      "The CLVR token unlocks the guild badge and three seasonal cosmetics, a vote in the monthly cosmetic poll, and entry to ticketed race nights. It does nothing else, in Pawket or anywhere Pawket controls.",
    reviewed: "Reviewed 4 Mar",
    token: {
      symbol: "CLVR",
      launch: { value: 6, max: 10, readout: "612 participants" },
      allocation: [
        { k: "Community", v: "62% · unlocked" },
        { k: "Creators", v: "18% · 24-month vest" },
        { k: "Treasury", v: "20% · 3-of-5 multisig" },
        { k: "Next unlock", v: "1 Jun 2026 · 2.5%" },
        { k: "Liquidity", v: "Locked 12 months" },
        { k: "Fees to", v: "Treasury 70% · creators 30%" },
      ],
      treasury: {
        indexed: "Indexed 4m ago",
        rows: [
          { k: "Balance", v: "1,840.2 SOL" },
          { k: "In · trading fees", v: "+212.0" },
          { k: "Out · spring prizes", v: "-96.0" },
          { k: "Out · cosmetic commission", v: "-40.0" },
        ],
        note: "Spendable only on events, prizes, cosmetics and community work, as published.",
      },
      quote: {
        payAmount: "2.00",
        payAsset: "SOL",
        receiveAmount: "41,208",
        receiveAsset: "CLVR",
        rows: [
          // Price impact is the only coloured figure on the screen.
          { k: "Price impact", v: "3.4%", tone: "warn" },
          { k: "Slippage limit", v: "0.5%" },
          { k: "Network fee", v: "~0.00021 SOL" },
          { k: "Route", v: "Bonding curve · verified" },
        ],
        total: { k: "Most you can pay", v: "2.01 SOL" },
        note: "An estimate. The transaction can fail, or confirm later than this screen shows.",
        validFor: "Quote valid 12s",
      },
    },
    events: [
      { name: "Meadow race night", when: "Friday, 8pm", note: "Free for members", open: true },
      { name: "Cosmetic vote · spring", when: "Closes 1 May", note: "Token holders vote", open: true },
      { name: "Winter bunting draw", when: "Ended 3 Feb", note: "Results published", open: false },
    ],
    policy: [
      "Pawket can delist this guild, remove its badge and stop its benefits under policy.",
      "Pawket cannot reverse a transaction, freeze a token, or take anyone’s assets.",
      "Metadata or authority changes flag the guild and pause benefits pending verification.",
    ],
  },
  {
    slug: "window-seat",
    name: "The Window Seat",
    letter: "W",
    color: "var(--pool)",
    members: "1,240",
    stage: "none",
    stageLabel: "Social guild · no token",
    blurb: "A quiet room for cat owners. No token, no launch.",
    summary:
      "A quiet room for cat owners. Screenshot threads, slow chat, and a shared window backdrop.",
    official: true,
    joined: true,
    events: [
      { name: "Sunday screenshots", when: "Every Sunday", note: "Open to everyone", open: true },
      { name: "Nap contest social", when: "Saturday, 3pm", note: "No entry fee", open: true },
    ],
    policy: [
      "This guild has no token and no launch. Nothing here costs anything.",
      "Pawket can delist this guild and stop its benefits under policy.",
    ],
  },
  {
    slug: "nightshift",
    name: "Nightshift",
    letter: "N",
    members: "806",
    stage: "pending",
    stageLabel: "Migration pending",
    blurb: "For people who play after midnight. Lanterns, slow games.",
    summary:
      "For people who play after midnight. Lantern cosmetics, slow games, and a late-night lobby.",
    official: false,
    markLabel: "Not yet approved",
    joined: false,
    utility:
      "The NGHT token unlocks a lantern cosmetic set and entry to late lobbies. It does nothing else, in Pawket or anywhere Pawket controls.",
    reviewed: "Not yet approved",
    token: {
      symbol: "NGHT",
      launch: { value: 10, max: 10, readout: "1,004 participants" },
      allocation: [
        { k: "Community", v: "70% · unlocked" },
        { k: "Creators", v: "10% · 24-month vest" },
        { k: "Treasury", v: "20% · 3-of-5 multisig" },
        { k: "Liquidity", v: "Locked 12 months" },
      ],
      treasury: {
        indexed: "Indexed 11m ago",
        rows: [
          { k: "Balance", v: "204.0 SOL" },
          { k: "In · trading fees", v: "+14.2" },
        ],
        note: "Spendable only on events, prizes, cosmetics and community work, as published.",
      },
      quote: {
        payAmount: "1.00",
        payAsset: "SOL",
        receiveAmount: "—",
        receiveAsset: "NGHT",
        rows: [
          { k: "Route", v: "Paused" },
          { k: "Network fee", v: "—" },
        ],
        total: { k: "Most you can pay", v: "—" },
        note: "Nothing is submitted while the new pool is being verified.",
        validFor: "Paused",
      },
    },
    events: [{ name: "Late lobby", when: "Nightly, midnight", note: "Open to everyone", open: true }],
    policy: [
      "This guild is not yet approved by Pawket. Anything it published is its own claim.",
      "Pawket cannot reverse a transaction, freeze a token, or take anyone’s assets.",
    ],
  },
];

export function findDemoGuild(slug: string): DemoGuild | undefined {
  return DEMO_GUILDS.find((guild) => guild.slug === slug);
}

/** The boundary every approved guild has to stay inside. */
export const GUILD_CAN = [
  "Give you a badge, flair and guild cosmetics",
  "Let you into creator and community events",
  "Vote on cosmetic themes, shared spaces and event formats",
  "Fund events and prizes from a treasury you can inspect",
  "Discount or early-access non-essential cosmetic drops",
];

export const GUILD_CANNOT = [
  "Raise a pet’s stats or speed up its care",
  "Multiply XP or change how a pet grows",
  "Give matchmaking priority or any edge in a game",
  "Be required to adopt, play, progress or trade",
  "Promise yield, returns or a price that goes up",
];

/** Five numbered lines, read once before a first token purchase. */
export const RISK_LINES = [
  "This is not an investment. Pawket makes no promise about its price, and it can fall to zero.",
  "It buys flair, cosmetics, votes and event entry — nothing that affects a pet or a game.",
  "You never need it. Pawket works fully without it.",
  "Transactions are final. Pawket cannot reverse, refund or recover them.",
  "If you sell, the guild benefits stop. Your pets and your progress do not.",
];
