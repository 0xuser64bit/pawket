import { expect, test } from "@playwright/test";
import { dailySeed } from "../src/lib/play/best";
import { dealPairs } from "../src/lib/play/pairs";

test("landing leads with the pet and closes with the rules", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Raise a pet. Keep every paw print." })).toBeVisible();
  await expect(page.getByText(/no wallet, no token/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /adopt a pet/i }).first()).toBeVisible();
  // The room, as photos taken in it, and its things.
  await expect(page.getByRole("heading", { name: "A room that is theirs" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Pepper, a ginger cat/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "See the room's things" })).toHaveAttribute("href", "/market#decor");

  await expect(page.getByRole("heading", { name: "What you actually own" })).toBeVisible();
  await expect(page.getByText(/can fall to nothing/).first()).toBeVisible();
  await page.getByText("The whole asset model").click();
  await expect(page.getByRole("cell", { name: "A guild's coin" })).toBeVisible();
  await expect(page.getByText(/never touches a pet/i).first()).toBeVisible();
  await expect(page.getByText(/design preview|demo data/i)).toHaveCount(0);
});

test("the privacy policy is a click from the front door, with a way to write", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "hi@pawket.world" })).toHaveAttribute("href", "mailto:hi@pawket.world");
});

test("the dock reaches the places that exist", async ({ page }) => {
  await page.goto("/home");
  const dock = page.getByRole("navigation", { name: "Pawket" });
  for (const place of ["Home", "Park", "Playground", "Market", "Profile", "Guilds"]) {
    await expect(dock.getByRole("link", { name: place })).toBeVisible();
  }
});

test("the park is read from Solana, or says plainly that it could not be", async ({ page }) => {
  await page.goto("/park");
  await expect(page.getByRole("heading", { name: "Park" })).toBeVisible();
  await expect(
    page.getByText(/every pet kept on solana, read live|solana did not answer/i).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /buy|swap|pay/i })).toHaveCount(0);
});

test("an address with no pet is a plain miss, not an error", async ({ page }) => {
  await page.goto("/pet/11111111111111111111111111111111");
  await expect(
    page.getByText(/no pet lives at that address|solana did not answer/i),
  ).toBeVisible();
});

test("a wallet is offered, never asked for: the front door has none, the shell has Connect", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /connect/i })).toHaveCount(0);
  await page.goto("/home");
  const shell = page.getByRole("banner");
  await shell.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Connect a wallet" })).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  // A tap on the room's name moves into the next room; no menu opens.
  const room = shell.getByRole("button", { name: /^Room: / });
  const before = await room.getAttribute("aria-label");
  await room.click();
  await expect(room).not.toHaveAttribute("aria-label", before ?? "");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await expect(page.getByText(/Already keep a pet on Solana\?/)).toBeVisible();
  await page.getByRole("button", { name: "Connect a wallet" }).click();
  const sheet = page.getByRole("dialog", { name: "Connect a wallet" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/devnet/i).first()).toBeVisible();
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(sheet).toHaveCount(0);
});

test("an empty room asks you to adopt and does not pretend to care", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "The window is open" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Feed" })).toHaveCount(0);
});

test("guilds are optional, read from Solana, and trade nothing outside a coin's own page", async ({ page }) => {
  await page.goto("/guilds");
  await expect(page.getByRole("heading", { name: "Guilds" })).toBeVisible();
  await expect(page.getByText(/optional, always/i)).toBeVisible();
  // The rule every guild lives inside is a fold away.
  await page.getByText("The rule every guild lives inside").click();
  await expect(page.getByText(/raise a pet/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /buy|swap|pay/i })).toHaveCount(0);
  await expect(page.getByText(/coin/i).first()).toBeVisible();

  // Founding asks for a pet on Solana, and a wallet only once there is something to sign.
  await page.getByRole("link", { name: "Found a guild" }).click();
  await page.getByRole("textbox", { name: "Guild name" }).fill("Sunbeam Club");
  await expect(page.getByText("/guilds/sunbeam-club")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect a wallet" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Found Sunbeam Club/ })).toBeDisabled();
});

test("a guild's coin states its terms and what can go wrong, and asks a wallet only to trade", async ({ page }) => {
  await page.goto("/guilds/sunbeam-club/coin");
  const read = page.getByText(/solana did not answer|guild coins are off here|no guild has that name/i);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(read.or(heading)).toBeVisible();
  // Nothing signs here without a wallet, and nothing is offered as a promise.
  await expect(page.getByRole("button", { name: /^sign/i })).toHaveCount(0);
  await expect(page.getByText(/guaranteed|to the moon|passive income/i)).toHaveCount(0);
  if (await read.isVisible()) return;
  await expect(heading).toContainText(/coin/i);
  await expect(page.getByText("The terms")).toBeVisible();
  await expect(page.getByText("What can go wrong")).toBeVisible();
  // What it does and never does is a fold away, open on a tap.
  await page.getByText("What it does, and never does").click();
  await expect(page.getByText(/never changes a pet's vitals/i)).toBeVisible();
});

test("the Market states its fixed prices and where the SOL goes, and asks a wallet only to buy", async ({ page }) => {
  await page.goto("/market");
  await expect(page.getByRole("heading", { name: "Market" })).toBeVisible();
  await expect(page.getByText(/looks only, never power/i)).toBeVisible();
  for (const piece of ["Star pin", "Halo", "Wizard hat", "Sun hat", "Gold crown", "Cowboy hat", "Necktie", "Strawberry", "Blossom", "Aurora", "Terracotta", "Arcade", "Postcard", "Film strip", "Garden", "Sunshine", "Instant", "Confetti"]) {
    await expect(page.getByText(piece, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText("Where the SOL goes")).toBeVisible();
  // Each shelf wears its material: classic pieces cloth, the rest foil, rooms glass, frames copper.
  for (const [name, kind] of [["Star pin", "Cloth piece"], ["Halo", "Foil piece"], ["Aurora", "Glass room"], ["Postcard", "Copper frame"]]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${name}`) })).toContainText(kind);
  }
  await page.getByRole("button", { name: /Halo/ }).click();
  // The item opens over the shelves, not under them.
  const sheet = page.getByRole("dialog", { name: "Halo" });
  await expect(sheet.getByText(/changes no vital, XP, cooldown or score/i)).toBeVisible();
  // No wallet yet: the one action is connecting, never a purchase.
  await expect(sheet.getByRole("button", { name: /^Buy for/ })).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "Connect a wallet" })).toBeVisible();
});

test("the Market can be searched and narrowed, and a narrowed shelf can be linked to", async ({ page }) => {
  await page.goto("/market");
  await page.getByRole("searchbox", { name: "Search the Market" }).fill("glasses");
  await expect(page.locator(".pk-tiles button")).toHaveCount(3);
  await page.getByRole("searchbox", { name: "Search the Market" }).fill("pink room");
  await expect(page.locator(".pk-tiles button")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Search the Market" }).fill("nothing called this");
  await page.getByRole("button", { name: "Show everything" }).click();
  await expect(page.locator(".pk-tiles button")).toHaveCount(79);
  await page.getByRole("radio", { name: "Rooms" }).click();
  await expect(page).toHaveURL(/#room$/);
  await expect(page.locator(".pk-tiles button")).toHaveCount(12);
  await page.goto("/market#eyes");
  await expect(page.getByRole("radio", { name: "Glasses" })).toBeChecked();
  await expect(page.locator(".pk-tiles button")).toHaveCount(3);
});

test("the room's things are in the Market: free ones placed at once, a room's own one shown with its room", async ({ page }) => {
  await page.goto("/market#decor");
  await expect(page.locator(".pk-tiles button")).toHaveCount(34);
  await page.getByRole("button", { name: /^Blossom scroll/ }).click();
  const scroll = page.getByRole("dialog", { name: "Blossom scroll" });
  await expect(scroll.getByText(/comes with the Blossom room/)).toBeVisible();
  await scroll.getByRole("button", { name: "See the Blossom room" }).click();
  await expect(page.getByRole("dialog", { name: "Blossom" })).toBeVisible();
  await page.getByRole("dialog", { name: "Blossom" }).getByRole("button", { name: "Not now" }).click();
  await page.getByRole("button", { name: /^Wall clock/ }).click();
  await page.getByRole("dialog", { name: "Wall clock" }).getByRole("button", { name: "Place in your room" }).click();
  await expect(page.getByRole("dialog", { name: "Wall clock" }).getByRole("link", { name: "See it at home" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pawket.room-decor.v1") ?? "{}").slots?.wall)).toBe("wall-clock");
});

test("the pulse is counted from the program, or says plainly that Solana did not answer", async ({ page }) => {
  await page.goto("/pulse");
  await expect(page.getByRole("heading", { name: "Pulse" })).toBeVisible();
  await expect(page.getByText(/kept on solana|solana did not answer/i).first()).toBeVisible();
  await expect(page.getByText(/counted from pawket's program on solana, read live/i)).toBeVisible();
});

test("a guild nobody founded is a plain miss, and free to found under its name", async ({ page }) => {
  await page.goto("/guilds/no-such-guild-here");
  await expect(page.getByText(/no guild has that name|solana did not answer/i)).toBeVisible();
  const found = page.getByRole("link", { name: "Found No Such Guild Here" });
  if (await found.count()) {
    await found.click();
    await expect(page.getByRole("textbox", { name: "Guild name" })).toHaveValue("No Such Guild Here");
    await expect(page.getByText("/guilds/no-such-guild-here")).toBeVisible();
  }
});

test("a care pressed from the keyboard keeps focus on its button, resting", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  const feed = page.getByRole("button", { name: "Feed" });
  await feed.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
  const resting = page.getByRole("button", { name: /Feed, resting for/ });
  await expect(resting).toBeFocused();
  await expect(resting).toBeDisabled();
  // Browsers that follow the HTML focus-fixup rule drop focus from a button once it is
  // `disabled`; Chromium may keep it, so the markup that avoids the drop is held here too.
  await expect(resting).toHaveAttribute("aria-disabled", "true");
  await expect(resting).not.toHaveAttribute("disabled");
  // Pressing it again while it rests does nothing.
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Fed\. \+10 XP/)).toHaveCount(1);
});

test("adopting a pet needs no wallet and makes Home real", async ({ page }) => {
  await page.goto("/adopt");
  await expect(page.getByText(/wallet|connect|solana|token/i)).toHaveCount(0);

  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByRole("heading", { name: "Pepper is yours." })).toBeVisible();

  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByRole("heading", { name: "Pepper's room" })).toBeVisible();
  await expect(page.getByText(/In this browser/)).toBeVisible();
  // Keeping it on Solana has a labelled control beside the room's name.
  await expect(page.getByRole("button", { name: "Keep Pepper on Solana" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Fullness 72 / 100" })).toBeVisible();

  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
  // The first meal is a sticker, said as it is earned.
  await expect(page.getByText(/New sticker: First meal\./)).toBeVisible();
  await expect(page.getByRole("img", { name: "Fullness 95 / 100" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Feed/ })).toBeDisabled();
  await expect(page.getByRole("listitem").filter({ hasText: "A meal" })).toContainText("done");

  // The full numbers are a tool away, not in the way.
  await page.getByRole("button", { name: "Today" }).click();
  await expect(page.getByText("Today with Pepper")).toBeVisible();
  await expect(page.getByText("95 / 100")).toBeVisible();
});

test("letting a pet go stays on its page if storage fails, and can be retried", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem("pawket.pets.v1")!)[0].id as string);
  await page.goto(`/pet/${id}`);
  await page.getByRole("button", { name: "Let Pepper go", exact: true }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Storage unavailable", "QuotaExceededError"); };
  });
  await page.getByRole("button", { name: "Let them go", exact: true }).click();
  await expect(page.getByText("Could not save that change")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/pet/${id}$`));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("pawket.pets.v1")!).length)).toBe(1);

  // A reload restores storage and lets the same action finish.
  await page.reload();
  await page.getByRole("button", { name: "Let Pepper go", exact: true }).click();
  await page.getByRole("button", { name: "Let them go", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "The window is open" })).toBeVisible();
});

test("a new level is said out loud, and nothing else about the care changes", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByRole("heading", { name: "Pepper's room" })).toBeVisible();

  // Five XP short of level two.
  await page.evaluate(() => {
    const [pet] = JSON.parse(localStorage.getItem("pawket.pets.v1")!);
    localStorage.setItem("pawket.pets.v1", JSON.stringify([{ ...pet, xp: 95 }]));
  });
  await page.reload();
  await expect(page.getByText("95 / 100 XP")).toBeVisible();
  await page.getByRole("button", { name: "Feed" }).click();
  // The level is its own toast, in front of the care's line, which no longer repeats it;
  // the line is tucked under it until the stack is fanned out.
  await expect(page.getByText("Pepper is level 2!")).toBeVisible();
  const care = page.getByText(/^Fed\. \+10 XP\. Day 1\./);
  await expect(care).toBeHidden();
  await page.getByText("Pepper is level 2!").hover();
  await expect(care).toBeVisible();
  await expect(care).not.toContainText("level");
  await expect(page.getByRole("img", { name: /^Level 2,/ })).toBeVisible();
});

test("a second adoption keeps the first pet, and either can be at home", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByRole("heading", { name: "Pepper's room" })).toBeVisible();

  await page.goto("/adopt");
  await expect(page.getByText(/Pepper will have company/)).toBeVisible();
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByText(/already have a pet called pepper/i)).toBeVisible();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Miso");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByRole("heading", { name: "Miso's room" })).toBeVisible();

  // Either one comes home from the room itself.
  await page.getByRole("button", { name: "Bring Pepper home" }).click();
  await expect(page.getByRole("heading", { name: "Pepper's room" })).toBeVisible();
  // The old shelf's link lands on the profile, where every pet is kept.
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/profile/);
  await page.getByRole("button", { name: "Bring home" }).click();
  await expect(page.getByRole("heading", { name: "Miso's room" })).toBeVisible();
});

test("the wardrobe is worn on the pet, and the record keeps the care", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: "Moss pup", exact: true }).click();
  await page.getByRole("button", { name: /choose the moss pup/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Nib");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.getByRole("button", { name: "Brush" }).click();
  await expect(page.getByText(/Brushed\. \+10 XP/)).toBeVisible();

  await page.getByRole("link", { name: "Nib's record" }).click();
  await expect(page.getByRole("heading", { name: "Nib", exact: true })).toBeVisible();
  await expect(page.getByText("Brushed").first()).toBeVisible();

  await page.goto("/inventory?tab=wardrobe");
  await page.getByRole("button", { name: /Wool scarf/ }).click();
  await expect(page.getByRole("button", { name: /Wool scarf/ })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/home");
  await expect(page.getByText("Wool scarf", { exact: true })).toBeVisible();
});

test("the profile names you, counts what you have done, and keeps three outfits", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();

  await page.getByRole("navigation", { name: "Pawket" }).getByRole("link", { name: "Profile" }).click();
  await expect(page.getByRole("heading", { name: "You", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Your name" }).fill("Arth");
  await expect(page.getByRole("heading", { name: "Arth", exact: true })).toBeVisible();

  await page.locator("summary", { hasText: "How you look" }).click();
  await page.getByRole("button", { name: "Keep this look" }).first().click();
  await expect(page.getByText("Kept as outfit 1.")).toBeVisible();
  await page.getByRole("tab", { name: "Clothes" }).click();
  await page.getByRole("radiogroup", { name: "Top colour" }).getByRole("radio", { name: "Sprout" }).click();
  await page.getByRole("button", { name: "Wear" }).click();
  await expect(page.getByRole("radiogroup", { name: "Top colour" }).getByRole("radio", { name: "Pool" })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("tab", { name: "Stickers", exact: true }).click();
  await expect(page.getByText("Earned by Pepper").first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Arth", exact: true })).toBeVisible();
});

test("a playground round finishes and keeps a daily bonus", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: "Cloud bun", exact: true }).click();
  await page.getByRole("button", { name: /choose the cloud bun/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Tuesday");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();

  await page.goto("/playground");
  await expect(page.getByText("Today's round is worth 25 XP")).toBeVisible();
  // A pet that never jumps meets the first flower pot: the round is over.
  await page.getByRole("button", { name: /^Play Hop/ }).click();
  await page.getByRole("application", { name: /^Hop/ }).click();
  await expect(page.getByText("Round finished")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/\+25 XP for playing today/)).toBeVisible();

  // The bonus is once a day; another game still counts and says so.
  await page.getByRole("button", { name: "Another game" }).click();
  await expect(page.getByText("Tuesday has today's round")).toBeVisible();
  await page.getByRole("button", { name: /^Play Copy/ }).click();
  await page.getByRole("button", { name: "Start copying" }).click();
  for (let tap = 0; tap < 40; tap++) {
    if (await page.getByText("Round finished").isVisible()) break;
    const bean = page.getByRole("button", { name: "Sun bean (1)" });
    if (await bean.isEnabled()) await bean.click();
    await page.waitForTimeout(250);
  }
  await expect(page.getByText("Round finished")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/already earned today's play bonus/)).toBeVisible();
});

test("today's Pairs is the same round for everyone, and a perfect one is sixty", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.goto("/playground");
  await page.getByRole("button", { name: /^Play Pairs/ }).click();
  await expect(page.getByText("Today's round", { exact: true })).toBeVisible();

  // The deal is the day's, so the test can know it — as anyone could.
  const today = new Date().toISOString().slice(0, 10);
  const { cards } = dealPairs(dailySeed("pairs", today));
  const board = page.getByRole("group", { name: /^Pairs\./ });
  for (let face = 0; face < 6; face++) {
    await board.getByRole("button").nth(cards.indexOf(face)).click();
    await board.getByRole("button").nth(cards.lastIndexOf(face)).click();
  }
  await expect(page.getByText("60 points")).toBeVisible();
  await expect(page.getByText(/\+25 XP for playing today/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Share the score" })).toBeVisible();
});

test("adoption shows the pet you are making: its name on its blanket, its temperament on its first page", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: "Cloud bun", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cloud bun", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /choose the cloud bun/i }).click();

  await page.getByRole("button", { name: "Mochi" }).click();
  await expect(page.getByRole("textbox", { name: "Pet name" })).toHaveValue("Mochi");
  await expect(page.locator(".pk-adopt__tag")).toHaveText("Mochi");
  await page.getByRole("button", { name: /Mischief/ }).click();
  await expect(page.getByRole("button", { name: /Mischief/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("radio", { name: "Mint" }).click();
  await expect(page.getByText("Their coat: Mint")).toBeVisible();

  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByRole("heading", { name: "Mochi is yours." })).toBeVisible();
  await expect(page.getByText("Their first page")).toBeVisible();
  await expect(page.getByText("Mischief", { exact: true })).toBeVisible();
  await expect(page.getByText("Cloud bun", { exact: true })).toBeVisible();
  await expect(page.getByText("Mint", { exact: true })).toBeVisible();
  // The coat is the pet's on this device: the wardrobe keeps it, and changes it.
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.goto("/profile?tab=wardrobe#shelf");
  await expect(page.getByRole("radio", { name: "Mint" })).toBeChecked();
  await page.getByRole("radio", { name: "Cocoa" }).click();
  await page.reload();
  await expect(page.getByRole("radio", { name: "Cocoa" })).toBeChecked();
});

test("a short name is refused in words, not in bytes", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("button", { name: /that’s the one/i }).click();
  const error = page.getByRole("main").getByRole("alert");
  await expect(error).toContainText(/at least two plain letters/i);
  const name = page.getByRole("textbox", { name: "Pet name" });
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await name.fill("🐾".repeat(7));
  await expect(error).toHaveCount(0);
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(error).toContainText("That name is too long");
  await name.fill("🐾");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByRole("heading", { name: "🐾 is yours." })).toBeVisible();
});

test("look tabs and colour choices have one keyboard stop and follow navigation keys", async ({ page }) => {
  await page.goto("/profile#look");
  const tabs = page.getByRole("tablist", { name: "Parts of your look" });
  const body = tabs.getByRole("tab", { name: "Body" });
  await body.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Hair" })).toBeFocused();
  await expect(tabs.getByRole("tab", { name: "Hair" })).toHaveAttribute("aria-selected", "true");
  await expect(body).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: "Extras" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(body).toBeFocused();
  const tones = page.getByRole("radiogroup", { name: "Skin" });
  await tones.getByRole("radio", { checked: true }).focus();
  await page.keyboard.press("End");
  await expect(tones.getByRole("radio").last()).toBeFocused();
  await expect(tones.getByRole("radio").last()).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Home");
  await expect(tones.getByRole("radio").first()).toBeFocused();
});

test("health endpoint says whether Solana and the sponsor answer, and nothing secret", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(["ok", "degraded"]).toContain(body.status);
  expect(body.service).toBe("pawket-web");
  expect(body.rpc).toEqual({ ok: expect.any(Boolean), ms: expect.any(Number) });
  expect(typeof body.sponsor.available).toBe("boolean");
  // No URL, key or balance ever leaves in it.
  expect(JSON.stringify(body)).not.toMatch(/https?:|api-key|lamports/i);
});

test("no page can be framed by another site, and responses carry the basic headers", async ({ request }) => {
  for (const path of ["/", "/home", "/api/health"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
  }
});
