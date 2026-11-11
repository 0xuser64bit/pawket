import { expect, test } from "@playwright/test";

// Playwright fulfils the document below, which makes Chromium treat the page as
// a public origin. Its Local Network Access checks then block next dev's HMR
// WebSocket, and hydration waits for that connection. Production has no HMR,
// and the CSP assertions are what this file proves, so allow the test server.
test.use({ launchOptions: { args: ["--disable-audio-output", "--disable-features=LocalNetworkAccessChecks"] } });

test("scripts require this document's nonce while adoption and navigation hydrate", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let unexpectedScriptRequests = 0;
  await page.route("**/__untrusted-script.js", async (route) => {
    unexpectedScriptRequests++;
    await route.fulfill({ contentType: "application/javascript", body: "window.__pawketUntrustedScriptRan = true" });
  });
  // Simulate untrusted HTML reaching a document parser. Debugger-created
  // scripts inherit automation's execution authority and are not an XSS test.
  await page.route("**/adopt", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    const body = (await response.text()).replace("</head>", '<script>window.__pawketUntrustedScriptRan = true</script><script src="/__untrusted-script.js"></script></head>');
    await route.fulfill({ response, body });
  });
  const response = await page.goto("/adopt");
  const policy = response!.headers()["content-security-policy"];
  expect(policy).toContain("'strict-dynamic'");
  const nonce = /'nonce-([^']+)'/.exec(policy)![1];
  expect(nonce).toBeTruthy();
  const scripts = await page.locator("script").evaluateAll((nodes) => nodes.map((node) => {
    const script = node as HTMLScriptElement;
    return { nonce: script.nonce, src: script.src, type: script.type };
  }));
  const executableInline = scripts.filter((script) => script.nonce && !script.src && !["application/json", "application/ld+json"].includes(script.type));
  expect(executableInline.length).toBeGreaterThan(0);
  expect(executableInline.map((script) => script.nonce)).toEqual(executableInline.map(() => nonce));
  await expect(page.locator(".pk-boot")).toHaveCount(0);
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Nonce");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: "Take them home" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "Nonce's room" })).toBeVisible();
  // Exercise both Meshopt's WebAssembly and the GLB loader's blob reads.
  await expect(page.getByRole("group", { name: /arrow keys turn the room/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Photo", exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => Reflect.get(window, "__pawketUntrustedScriptRan") === true)).toBe(false);
  expect(unexpectedScriptRequests).toBe(0);
  const next = await page.goto("/profile");
  expect(/'nonce-([^']+)'/.exec(next!.headers()["content-security-policy"])![1]).not.toBe(nonce);
});
