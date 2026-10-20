import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });

test("adoption follows the visible pet after a swipe and viewport change, with compact named controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/adopt");
  await page.locator(".pk-boot").waitFor({ state: "detached" });
  const stage = page.locator(".pk-adopt__stage");
  await page.getByRole("button", { name: "Moss pup", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Choose the moss pup" })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 650 });
  await page.getByRole("button", { name: "Luna cat", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Choose the luna cat" })).toBeVisible();
  expect(await stage.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Choose the luna cat" }).tap();
  const name = page.getByRole("textbox", { name: "Pet name" });
  await name.fill("Pepper");
  await expect(page.locator("label", { hasText: "Pet name" })).toBeVisible();
  expect((await name.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await name.blur();
  const box = (await name.boundingBox())!;
  await name.tap({ position: { x: box.width / 2, y: box.height - 3 } });
  await expect(name).toBeFocused();
  const cards = page.locator(".pk-temper");
  const first = (await cards.nth(0).boundingBox())!;
  const second = (await cards.nth(1).boundingBox())!;
  expect(first.y).toBe(second.y);
  expect(second.x).toBeGreaterThan(first.x + first.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("the icon-only room control and modal close are usable on a phone", async ({ page }) => {
  await page.goto("/home");
  const room = page.getByRole("button", { name: /^Room:/ });
  await expect(room).toHaveText("");
  const box = await room.boundingBox();
  expect(box && box.width >= 44 && box.height >= 44).toBe(true);
  const connect = page.getByRole("banner").getByRole("button", { name: "Connect", exact: true });
  await connect.click();
  const sheet = page.getByRole("dialog", { name: "Connect a wallet" });
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(sheet.getByRole("button", { name: "Not now" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(sheet.getByRole("button", { name: "Close Connect a wallet" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(connect).toBeFocused();
});

test("a large pet family and room controls fit a narrow phone, with Profile last", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await adopt(page);
  await page.evaluate(() => {
    const pets = JSON.parse(localStorage.getItem("pawket.pets.v1")!);
    localStorage.setItem("pawket.pets.v1", JSON.stringify(Array.from({ length: 12 }, (_, i) => ({
      ...pets[0], id: `guest-family-${i}`, name: `Pepper ${i + 1}`,
    }))));
  });
  await page.goto("/home");
  const family = page.getByRole("group", { name: "Who is home" });
  await expect(family.getByRole("button")).toHaveCount(12);
  expect(await family.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  // The view switch sits in the room's corner, both views readable, each a finger's width.
  const view = page.getByRole("radiogroup", { name: "Room view" });
  await expect(view).toBeVisible();
  for (const name of ["Flat room", "3D room"]) {
    const box = (await view.getByRole("radio", { name }).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  const room = (await page.locator(".pk-room").boundingBox())!;
  const corner = (await view.boundingBox())!;
  expect(corner.x + corner.width).toBeLessThanOrEqual(room.x + room.width);
  expect(corner.y).toBeGreaterThanOrEqual(room.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("navigation", { name: "Pawket" }).getByRole("link").last()).toHaveAttribute("href", "/profile");
});

test("a sheet stays within a short phone in either room, with its controls reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/market");
  await page.getByRole("button", { name: /Halo/ }).click();
  const sheet = page.getByRole("dialog", { name: "Halo" });
  await expect(sheet).toBeVisible();
  await expect.poll(async () => {
    const box = await sheet.boundingBox();
    return box && box.y >= 0 && box.x >= 0 && box.x + box.width <= 320 && box.y + box.height <= 480;
  }).toBe(true);
  await expect(sheet.getByRole("button", { name: "Not now" })).toBeInViewport();
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(sheet).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: /Halo/ }).click();
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(sheet).toHaveCount(0);
});

test("address controls have separate touch targets and secondary actions stay tappable", async ({ page }) => {
  await page.goto("/market");
  await page.locator("summary", { hasText: "Where the SOL goes" }).click();
  const copy = page.getByRole("button", { name: "Copy treasury" });
  const explorer = page.getByRole("link", { name: "Open treasury on the Explorer" });
  const a = (await copy.boundingBox())!;
  const b = (await explorer.boundingBox())!;
  expect(a.width).toBeGreaterThanOrEqual(44);
  expect(a.height).toBeGreaterThanOrEqual(44);
  expect(b.x).toBeGreaterThanOrEqual(a.x + a.width);
  await page.getByRole("button", { name: /Halo/ }).click();
  for (const name of ["Not now", "Connect a wallet"]) {
    const target = (await page.getByRole("dialog").getByRole("button", { name }).boundingBox())!;
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
});

async function adopt(page: import("@playwright/test").Page) {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.goto("/playground");
}

test("Home separates the room from care and keeps its labels and layout after a care", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await adopt(page);
  await page.goto("/home");
  const room = (await page.locator(".pk-room").boundingBox())!;
  const deck = (await page.locator(".pk-deck").boundingBox())!;
  expect(deck.y).toBeGreaterThan(room.y + room.height);
  const keep = page.getByRole("button", { name: "Keep Pepper on Solana" });
  const target = (await keep.boundingBox())!;
  expect(target.height).toBeGreaterThanOrEqual(44);
  const feed = page.getByRole("button", { name: "Feed", exact: true });
  const before = (await feed.boundingBox())!;
  await feed.tap();
  const resting = page.getByRole("button", { name: /^Feed, resting/ });
  await expect(resting).toBeDisabled();
  await expect(resting).toContainText("Feed");
  await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
  const after = (await page.locator(".pk-deck").boundingBox())!;
  expect((await resting.boundingBox())!.y - after.y).toBe(before.y - deck.y);
  expect(after.height).toBe(deck.height);
});

test("a large pet family scrolls inside its picker, with long names wrapping on the screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await adopt(page);
  await page.evaluate(() => {
    const [pet] = JSON.parse(localStorage.getItem("pawket.pets.v1")!);
    localStorage.setItem("pawket.pets.v1", JSON.stringify([pet, ...Array.from({ length: 10 }, (_, i) => ({ ...pet, id: `family-${i}`, name: `MarmaladeMarmalade${i}` }))]));
  });
  await page.goto("/home");
  const picker = page.getByRole("group", { name: "Who is home" });
  expect(await picker.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await picker.getByRole("button", { name: "Bring MarmaladeMarmalade9 home" }).tap();
  await expect(page.getByRole("heading", { name: "MarmaladeMarmalade9's room" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.goto("/profile#shelf");
  const name = page.getByRole("heading", { name: "MarmaladeMarmalade9", exact: true });
  await expect(name).toBeVisible();
  expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("a long pet name keeps the sheet heading, close control and footer inside a short phone", async ({ page }) => {
  await adopt(page);
  await page.evaluate(() => {
    const [pet] = JSON.parse(localStorage.getItem("pawket.pets.v1")!);
    localStorage.setItem("pawket.pets.v1", JSON.stringify([{ ...pet, name: "MarmaladeMarmaladeMarmala" }]));
  });
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/home");
  await page.getByRole("button", { name: "Keep MarmaladeMarmaladeMarmala on Solana" }).tap();
  const sheet = page.getByRole("dialog", { name: "Keep MarmaladeMarmaladeMarmala on Solana" });
  await expect(sheet.getByRole("button", { name: /Close Keep/ })).toBeInViewport();
  await expect.poll(async () => {
    const box = (await sheet.getByRole("button", { name: "Connect a wallet" }).boundingBox())!;
    return box.y + box.height <= 480;
  }).toBe(true);
  const cancel = (await sheet.getByRole("button", { name: "Not now" }).boundingBox())!;
  const connect = (await sheet.getByRole("button", { name: "Connect a wallet" }).boundingBox())!;
  expect(cancel.height).toBeCloseTo(connect.height, 1);
  expect(connect.x + connect.width).toBeLessThanOrEqual(320);
  expect(connect.y + connect.height).toBeLessThanOrEqual(480);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("room settings show two compact choices per row and remember a touch selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 650 });
  await page.goto("/profile?tab=settings#shelf");
  const rooms = page.getByRole("radiogroup", { name: "Rooms" });
  const choices = rooms.locator(".pk-theme");
  await expect(choices.nth(2)).toBeVisible();
  const [daylight, lamplight] = await choices.evaluateAll((nodes) => nodes.slice(1, 3).map((node) => {
    const { x, y, width } = node.getBoundingClientRect();
    return { x, y, width };
  }));
  expect(daylight.y).toBe(lamplight.y);
  expect(lamplight.x).toBeGreaterThan(daylight.x + daylight.width);
  expect((await rooms.boundingBox())!.height).toBeLessThan(1100);
  await rooms.getByText("Dark", { exact: true }).tap();
  await expect(rooms.getByRole("radio", { name: /^Dark/ })).toBeChecked();
  await page.reload();
  await expect(rooms.getByRole("radio", { name: /^Dark/ })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

for (const name of ["Catch", "Hop"]) {
  test(`${name} pauses without losing the round and resumes by touch`, async ({ page }) => {
    await adopt(page);
    await page.getByRole("button", { name: new RegExp(`^Play ${name}`) }).tap();
    const field = page.locator(".pk-game");
    await field.tap();
    await page.getByRole("button", { name: "Pause round" }).tap();
    await expect(page.getByText("Round paused")).toBeVisible();
    const before = await field.getAttribute("aria-label");
    await page.waitForTimeout(750);
    await expect(field).toHaveAttribute("aria-label", before!);
    await page.getByRole("button", { name: "Keep playing" }).tap();
    await expect(page.getByText("Round paused")).toHaveCount(0);
    await expect(field).not.toHaveAttribute("aria-label", before!, { timeout: 3000 });
  });
}

test("Catch keeps a finger drag and a backgrounded round pauses", async ({ page }) => {
  await adopt(page);
  await page.getByRole("button", { name: /^Play Catch/ }).tap();
  const field = page.locator(".pk-game");
  await expect(field).toBeInViewport();
  const box = (await field.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const point = (part: number) => ({ x: box.x + box.width * part, y: box.y + box.height * 0.7 });
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(0.25)] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(0.8)] });
  await expect.poll(() => page.locator(".pk-game__catcher").evaluate((el) => parseFloat((el as HTMLElement).style.left))).toBeGreaterThan(60);
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText("Round paused")).toBeVisible();
});

for (const name of ["Catch", "Hop", "Copy", "Pairs"]) {
  test(`${name} keeps its controls and playing area reachable in landscape`, async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 360 });
    await adopt(page);
    await page.getByRole("button", { name: new RegExp(`^Play ${name}`) }).tap();
    await expect(page.getByRole("button", { name: "Pause round" })).toBeInViewport();
    const area = page.locator(name === "Copy" ? ".pk-paws__paw" : name === "Pairs" ? ".pk-pairs__board" : ".pk-game");
    await expect(area).toBeInViewport({ ratio: 0.95 });
    const box = (await area.boundingBox())!;
    const dock = (await page.getByRole("navigation", { name: "Pawket" }).boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(dock.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}

test("starter choices stay small and every Market category opens a readable shareable preview", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 650 });
  await adopt(page);
  await page.goto("/profile?tab=wardrobe#shelf");
  await expect(page.locator(".pk-tiles button")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Knit beanie/ })).toHaveCount(0);
  await page.goto("/profile?tab=settings#shelf");
  await expect(page.getByRole("radiogroup", { name: "Rooms" }).getByRole("radio")).toHaveCount(3);
  await page.goto("/market");
  // 25 pieces, 12 rooms, 31 things for the room and 8 frames.
  await expect(page.locator(".pk-tiles button")).toHaveCount(76);
  await page.getByRole("button", { name: /Sunshine/ }).tap();
  const sheet = page.getByRole("dialog", { name: "Sunshine" });
  await expect(sheet.getByText("0.025 SOL", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Pawket Wallet", { exact: true })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Connect a wallet" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
