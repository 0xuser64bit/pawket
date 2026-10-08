// One step at a time while learning a flow: node step.mjs '<js using page, tap, at, type, sleep>'
import * as L from "./lib.mjs";
const { browser, page } = await L.connect();
const fn = new Function("page", "L", `return (async () => { ${process.argv[2]} })()`);
try { const r = await fn(page, L); if (r !== undefined) console.log(r); } catch (e) { console.log("ERR", e.message.split("\n")[0]); }
await browser.close().catch(() => {});
