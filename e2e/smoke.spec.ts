import { expect, test } from "@playwright/test";
import { dailySeed } from "../src/lib/play/best";
import { dealPairs } from "../src/lib/play/pairs";

test("landing leads with the pet and closes with the rules", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Raise a pet. Keep every paw print." })).toBeVisible();
  await expect(page.getByText(/no wallet, no token, no solana knowledge needed/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /adopt a pet/i }).first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "What you actually own" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "A guild's coin" })).toBeVisible();
  await expect(page.getByText(/adds? nothing to a pet/i).first()).toBeVisible();
  await expect(page.getByText(/design preview|demo data/i)).toHaveCount(0);
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
  const read = page.getByText(/solana did not answer|guild coins are off here/i);
  if (await read.isVisible().catch(() => false)) return;
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/coin/i);
  await expect(page.getByText("The terms")).toBeVisible();
  await expect(page.getByText("What can go wrong")).toBeVisible();
  // What it does and never does is a fold away, open on a tap.
  await page.getByText("What it does, and never does").click();
  await expect(page.getByText(/never changes a pet's vitals/i)).toBeVisible();
  // Nothing signs here without a wallet, and nothing is offered as a promise.
  await expect(page.getByRole("button", { name: /^sign/i })).toHaveCount(0);
  await expect(page.getByText(/guaranteed|to the moon|passive income/i)).toHaveCount(0);
});

test("the Market states its fixed prices and where the SOL goes, and asks a wallet only to buy", async ({ page }) => {
  await page.goto("/market");
  await expect(page.getByRole("heading", { name: "Market" })).toBeVisible();
  await expect(page.getByText(/looks only, never power/i)).toBeVisible();
  for (const piece of ["Halo", "Wizard hat", "Sun hat", "Gold crown", "Blossom", "Aurora"]) {
    await expect(page.getByText(piece, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText("Where the SOL goes")).toBeVisible();
  await page.getByRole("button", { name: /Halo/ }).click();
  // The item opens over the shelves, not under them.
  const sheet = page.getByRole("dialog", { name: "Halo" });
  await expect(sheet.getByText(/changes no vital, XP, cooldown or score/i)).toBeVisible();
  // No wallet yet: the one action is connecting, never a purchase.
  await expect(sheet.getByRole("button", { name: /^Buy for/ })).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "Connect a wallet" })).toBeVisible();
});

test("the pulse is counted from the program, or says plainly that Solana did not answer", async ({ page }) => {
  await page.goto("/pulse");
  await expect(page.getByRole("heading", { name: "Pulse" })).toBeVisible();
  await expect(page.getByText(/kept on solana|solana did not answer/i).first()).toBeVisible();
  await expect(page.getByText(/counted from pawket's program on solana, read live/i)).toBeVisible();
});

test("a guild nobody founded is a plain miss", async ({ page }) => {
  await page.goto("/guilds/no-such-guild-here");
  await expect(page.getByText(/no guild has that name|solana did not answer/i)).toBeVisible();
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
  await expect(page.getByText("In this browser", { exact: true })).toBeVisible();
  // Keeping it on Solana has a labelled control beside the room's switch.
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
  await expect(page.getByText(/Fed\. \+10 XP\. Day 1\. Pepper is level 2 now\./)).toBeVisible();
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

  await page.getByRole("link", { name: "Stickers" }).click();
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
  await expect(page.getByText(/Today's round ·/)).toBeVisible();

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

  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByRole("heading", { name: "Mochi is yours." })).toBeVisible();
  await expect(page.getByText("Their first page")).toBeVisible();
  await expect(page.getByText("Mischief", { exact: true })).toBeVisible();
  await expect(page.getByText("Cloud bun", { exact: true })).toBeVisible();
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

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("pawket-web");
});
