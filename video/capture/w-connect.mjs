// Take W1: connecting the wallet app on this phone through Mobile Wallet Adapter (signs nothing).
import * as L from "./lib.mjs";
import { writeFileSync } from "node:fs";
L.demoBar();
const { browser, page } = await L.connect();
const rec = L.recorder("w1-connect");
await L.sleep(1500);
await L.tap(page.getByRole("button", { name: /a wallet app on this phone/i }), { after: 4500 });
L.sh("uiautomator dump /sdcard/ui.xml");
writeFileSync("/private/tmp/claude-501/-Users-user64bit-Code-pawket/8d3d9dfe-725c-40bc-84ad-0c7752be8672/scratchpad/fakewallet-ui.xml", L.sh("cat /sdcard/ui.xml"));
await L.screenshot("/private/tmp/claude-501/-Users-user64bit-Code-pawket/8d3d9dfe-725c-40bc-84ad-0c7752be8672/scratchpad/shots/fw1.png");
await L.sleep(500);
console.log(await rec.stop());
await browser.close().catch(() => {});
