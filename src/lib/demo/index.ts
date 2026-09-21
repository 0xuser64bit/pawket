/**
 * Demo fixtures for design review.
 *
 * Nothing here is real. It exists so every screen can be walked through end
 * to end while the backend milestones are open. A screen that renders a
 * fixture says so — see `PreviewNote` — and no fixture may be described as
 * on-chain, owned, or confirmed.
 */

export {
  ACTIVE_PET,
  DEMO_PETS,
  PLAYER,
  PRESENCE,
  findDemoPet,
  type DemoPet,
} from "./pets";

export {
  DEMO_GAMES,
  DEMO_LISTINGS,
  GUILD_ITEMS,
  OWNED_ITEMS,
  SHOP_ITEMS,
  findDemoGame,
  findDemoListing,
  type DemoGame,
  type DemoItem,
  type DemoListing,
} from "./market";

export {
  DEMO_GUILDS,
  GUILD_CAN,
  GUILD_CANNOT,
  RISK_LINES,
  findDemoGuild,
  type DemoGuild,
} from "./guilds";
