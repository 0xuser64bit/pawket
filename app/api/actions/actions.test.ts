// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET as actionsJson } from "../../actions.json/route";
import { GET as adoptCard, OPTIONS, POST as adopt } from "./adopt/route";

/**
 * The Solana Actions spec, at the edges that need no network: the card, the
 * headers a Blink client checks, and every refusal that comes before a
 * transaction is built. The path that signs and sends is walked against
 * devnet (docs/SOLANA.md, "Blinks").
 */
const at = (path: string, init?: RequestInit) => new Request(`http://localhost:3000${path}`, init);
const posted = (path: string, account: unknown) =>
  at(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account }) });
const ACCOUNT = "11111111111111111111111111111112";

describe("Solana Actions", () => {
  it("names its routes and answers with the spec's headers", async () => {
    const rules = await actionsJson();
    expect(await rules.json()).toEqual({
      rules: [
        { pathPattern: "/adopt", apiPath: "/api/actions/adopt" },
        { pathPattern: "/pet/*", apiPath: "/api/actions/care/*" },
        { pathPattern: "/api/actions/**", apiPath: "/api/actions/**" },
      ],
    });
    for (const response of [rules, OPTIONS(), await adoptCard(at("/api/actions/adopt"))]) {
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("X-Action-Version")).toBe("2.4");
      expect(response.headers.get("X-Blockchain-Ids")).toBe("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG");
    }
  });

  it("draws the adoption card with every choice a Blink needs", async () => {
    const card = await (await adoptCard(at("/api/actions/adopt"))).json();
    expect(card).toMatchObject({ type: "action", label: "Adopt", icon: "http://localhost:3000/api/actions/icon" });
    const [linked] = card.links.actions;
    expect(linked.type).toBe("transaction");
    expect(linked.href).toBe("/api/actions/adopt?species={species}&personality={personality}&name={name}");
    expect(linked.parameters.map((p: { name: string }) => p.name)).toEqual(["species", "personality", "name"]);
    expect(linked.parameters[0].options.map((o: { value: string }) => o.value)).toEqual(["luna_cat", "moss_pup", "cloud_bun"]);
  });

  it("refuses before building anything, in one sentence each", async () => {
    const cases: Array<[string, unknown, RegExp]> = [
      ["/api/actions/adopt?species=luna_cat&personality=cozy&name=Pepper", "not-a-wallet", /not a wallet address/],
      ["/api/actions/adopt?species=dragon&personality=cozy&name=Pepper", ACCOUNT, /luna cat, a moss pup or a cloud bun/],
      ["/api/actions/adopt?species=luna_cat&personality=grumpy&name=Pepper", ACCOUNT, /describe them/],
      ["/api/actions/adopt?species=luna_cat&personality=cozy&name=P", ACCOUNT, /at least two characters/],
    ];
    for (const [path, account, message] of cases) {
      const response = await adopt(posted(path, account));
      expect(response.status, path).toBe(400);
      expect((await response.json()).message).toMatch(message);
    }
  });
});
