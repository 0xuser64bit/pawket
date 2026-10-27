// @vitest-environment node
import { createKeyPairSignerFromBytes, getBase64Encoder, getTransactionDecoder, type Instruction } from "@solana/kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CareActionType } from "@/lib/game/enums";
import { getCareInstruction } from "@/lib/solana/instructions";
import { caller, postedAccount } from "./actions";

const chain = vi.hoisted(() => ({ balance: 0n, reads: 0, asked: [] as unknown[][] }));
vi.mock("@/lib/solana/rpc", () => ({
  createPatientRpc: () => ({
    getBalance: (...args: unknown[]) => ({ send: async () => (chain.reads++, chain.asked.push(["getBalance", ...args]), { value: chain.balance }) }),
    getLatestBlockhash: (...args: unknown[]) => ({ send: async () => (chain.asked.push(["getLatestBlockhash", ...args]), { value: { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n } }) }),
  }),
}));

async function sponsor() {
  vi.resetModules();
  return import("./sponsor");
}

const SOL = 1_000_000_000n;
const ONE_RENT = 4_500_000n + 15_000n;
const NOW = 1_790_000_000_000;
const at = (ip: string | null) => new Request("http://localhost/api/sponsor", { headers: ip ? { "x-forwarded-for": ip } : {} });
const keypair = async () => {
  const pair = (await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])) as CryptoKeyPair;
  const secret = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey)).slice(-32);
  return Uint8Array.from([...secret, ...new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))]);
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
  chain.reads = 0;
  chain.asked = [];
});

describe("sponsorState", () => {
  it("pays nothing on mainnet, whatever key it holds, and nothing without a key", async () => {
    vi.stubEnv("SPONSOR_KEYPAIR", JSON.stringify(Array.from(await keypair())));
    vi.stubEnv("NEXT_PUBLIC_SOLANA_CLUSTER", "mainnet-beta");
    vi.stubEnv("NEXT_PUBLIC_SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com");
    chain.balance = 10n * SOL;
    expect(await (await sponsor()).sponsorState()).toEqual({ available: false, reason: "Pawket covers fees on devnet only." });
    vi.stubEnv("NEXT_PUBLIC_SOLANA_CLUSTER", "devnet");
    vi.stubEnv("NEXT_PUBLIC_SOLANA_RPC_URL", "https://api.devnet.solana.com");
    vi.stubEnv("SPONSOR_KEYPAIR", "");
    expect(await (await sponsor()).sponsorState()).toEqual({ available: false, reason: "Fees are not covered on this deployment." });
    expect(chain.reads).toBe(0);
  });

  it("names a key that is not one, and logs only the error's name", async () => {
    vi.stubEnv("SPONSOR_KEYPAIR", JSON.stringify(Array.from({ length: 63 }, (_, i) => 200 + (i % 50))));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect((await sponsor()).sponsorState()).rejects.toThrow("The sponsor's key is not valid on this deployment.");
    expect(logged).toHaveBeenCalledWith("[sponsor] SPONSOR_KEYPAIR is not a valid keypair:", "Error");
  });

  it("reads its float at most every 30 seconds or after it signed, and stops below 0.05 SOL", async () => {
    const bytes = await keypair();
    const address = (await createKeyPairSignerFromBytes(bytes)).address;
    vi.stubEnv("SPONSOR_KEYPAIR", JSON.stringify(Array.from(bytes)));
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    const { sponsorSpent, sponsorState, mayPayFee } = await sponsor();
    chain.balance = 50_000_000n;
    expect(await sponsorState()).toMatchObject({ available: true, address });
    expect(chain.asked).toEqual([["getBalance", address, { commitment: "confirmed" }]]);
    expect(mayPayFee(NOW)).toBe(true);
    chain.balance = 50_000_000n - 1n;
    vi.setSystemTime(NOW + 30_000);
    expect(await sponsorState()).toMatchObject({ available: true });
    expect(chain.reads).toBe(1);
    vi.setSystemTime(NOW + 30_001);
    expect(await sponsorState()).toEqual({ available: false, reason: "Pawket's fee float is empty for now.", address });
    chain.balance = SOL;
    sponsorSpent();
    expect(await sponsorState()).toMatchObject({ available: true, address });
    expect(chain.reads).toBe(3);
  });
});

describe("sponsoredForPlayer", () => {
  it("signs as fee payer what it would co-sign, and refuses to build what it would not", async () => {
    const { sponsoredForPlayer } = await sponsor();
    const signer = await createKeyPairSignerFromBytes(await keypair());
    const player = (await createKeyPairSignerFromBytes(await keypair())).address;
    const care = (owner: Parameters<typeof getCareInstruction>[0]["owner"]): Instruction =>
      getCareInstruction({ owner, pet: "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp", passport: "FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm", action: CareActionType.Feed });
    const wire = await sponsoredForPlayer(signer, player, ({ owner }) => [care(owner)]);
    expect(chain.asked).toEqual([["getLatestBlockhash", { commitment: "confirmed" }]]);
    const signed = getTransactionDecoder().decode(getBase64Encoder().encode(wire));
    expect(Object.keys(signed.signatures)).toEqual([signer.address, player]);
    expect(signed.signatures[signer.address]).toBeTruthy();
    expect(signed.signatures[player]).toBeNull();
    await expect(sponsoredForPlayer(signer, player, ({ payer }) => [care(payer)])).rejects.toThrow("The sponsor only pays; it takes no other part.");
  });
});

describe("caller", () => {
  it("counts an IPv6 address by its /64 and an IPv4 address, mapped or not, as itself", () => {
    expect(caller(at("203.0.113.7, 10.0.0.1"))).toBe("203.0.113.7");
    expect(caller(at("::ffff:203.0.113.7"))).toBe("203.0.113.7");
    expect(caller(at("2001:db8:0:12::1"))).toBe("2001:db8:0:12::/64");
    expect(caller(at("2001:DB8:0000:0012:abcd:ef01:2345:6789"))).toBe("2001:db8:0:12::/64");
    expect(caller(at("2001:db8::"))).toBe("2001:db8:0:0::/64");
    expect(caller(at(null))).toBe("local");
  });

  it("reads the first hop however it is spaced, and fills a short IPv6 address where its gap is", () => {
    expect(caller(at(" 203.0.113.7 , 10.0.0.1"))).toBe("203.0.113.7");
    expect(caller(at("2001::1:2:3:4:5:6"))).toBe("2001:0:1:2::/64");
    expect(caller(at("fe80::1:2:3:4"))).toBe("fe80:0:0:0::/64");
  });
});

describe("postedAccount", () => {
  const posted = (body: string) => postedAccount(new Request("http://localhost/api/actions/adopt", { method: "POST", body }));

  it("takes the account a wallet posts, and nothing that is not one string", async () => {
    expect(await posted('{"account":"3S6RvbyUvbCqyAEKNu3gGHDJoi7ZZB3JwQ7gFsDRhjEs"}')).toBe("3S6RvbyUvbCqyAEKNu3gGHDJoi7ZZB3JwQ7gFsDRhjEs");
    for (const body of ['{"account":7}', '{"account":["x"]}', "null", "{", ""]) expect(await posted(body), body).toBeNull();
  });
});

describe("sponsorAddress", () => {
  it("is the key's address, and none without a key", async () => {
    const bytes = await keypair();
    vi.stubEnv("SPONSOR_KEYPAIR", JSON.stringify(Array.from(bytes)));
    expect(await (await sponsor()).sponsorAddress()).toBe((await createKeyPairSignerFromBytes(bytes)).address);
    vi.stubEnv("SPONSOR_KEYPAIR", "");
    expect(await (await sponsor()).sponsorAddress()).toBeNull();
  });

  it("is unknown, never a thrown error carrying the key, when the sponsor's key is malformed", async () => {
    const { sponsorAddress } = await sponsor();
    vi.stubEnv("SPONSOR_KEYPAIR", `'${JSON.stringify(Array.from({ length: 64 }, (_, i) => 200 + (i % 50)))}'`);
    try {
      await expect(sponsorAddress()).resolves.toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("mayPayRent", () => {
  it("pays nothing before the sponsor's balance has been read", async () => {
    const { mayPayRent } = await sponsor();
    expect(mayPayRent(["a"])).toBe(false);
  });

  it("holds each key to its own share, and charges a key only when every key the caller goes by may pay", async () => {
    const { mayPayRent, noteFloat } = await sponsor();
    noteFloat(10n * SOL, 0);
    for (let i = 0; i < 20; i++) expect(mayPayRent(["wallet", `ip-${i}`], i)).toBe(true);
    expect(mayPayRent(["wallet", "ip-new"], 30)).toBe(false);
    expect(mayPayRent(["other-wallet", "ip-new"], 31)).toBe(true);
  });

  it("bounds the hour by what the sponsor's balance actually lost, plus what was signed lately", async () => {
    const { mayPayRent, noteFloat } = await sponsor();
    noteFloat(10n * SOL, 0);
    let signed = 0;
    while (mayPayRent([`key-${signed}`], 1000)) signed++;
    expect(BigInt(signed)).toBe(500_000_000n / ONE_RENT);
    expect(mayPayRent(["fresh"], 1000 + 120_000)).toBe(true);
    noteFloat(10n * SOL - 499_000_000n, 200_000);
    expect(mayPayRent(["after-spend"], 300_000)).toBe(false);
    noteFloat(12n * SOL, 300_001);
    expect(mayPayRent(["after-refill"], 300_002)).toBe(true);
    noteFloat(12n * SOL - 499_000_000n, 400_000);
    expect(mayPayRent(["late"], 400_001)).toBe(false);
    noteFloat(12n * SOL - 499_000_000n, 300_001 + 60 * 60 * 1000);
    expect(mayPayRent(["next-hour"], 300_002 + 60 * 60 * 1000)).toBe(true);
  });
});

describe("mayPayFee", () => {
  it("pays nothing before the sponsor's balance has been read", async () => {
    const { mayPayFee } = await sponsor();
    expect(mayPayFee()).toBe(false);
  });

  it("stops paying fees too once the hour's budget is gone, whoever asks", async () => {
    const { mayPayFee, mayPayRent, noteFloat } = await sponsor();
    noteFloat(10n * SOL, 0);
    expect(mayPayFee(1)).toBe(true);
    noteFloat(10n * SOL - 500_000_000n, 2);
    expect(mayPayFee(3)).toBe(false);
    expect(mayPayRent(["fresh"], 4)).toBe(false);
    noteFloat(10n * SOL - 500_000_000n, 3 + 60 * 60 * 1000);
    expect(mayPayFee(4 + 60 * 60 * 1000)).toBe(true);
  });

  it("keeps the hour, and what is in flight, across readings at the clock's own times", async () => {
    const { mayPayRent, noteFloat } = await sponsor();
    noteFloat(10n * SOL, NOW);
    noteFloat(10n * SOL - 499_000_000n, NOW + 1000);
    expect(mayPayRent(["after-spend"], NOW + 2000)).toBe(false);
    noteFloat(10n * SOL, NOW + 3_600_000);
    for (let i = 0; i < 110; i++) expect(mayPayRent([`key-${i}`], NOW + 3_600_001)).toBe(true);
    noteFloat(10n * SOL, NOW + 3_600_002);
    expect(mayPayRent(["still-in-flight"], NOW + 3_600_003)).toBe(false);
  });

  it("counts fees it signed lately, so a burst cannot outrun the balance it reads", async () => {
    const { mayPayFee, mayPayRent, noteFloat } = await sponsor();
    noteFloat(10n * SOL, 0);
    noteFloat(10n * SOL - 500_000_000n + 30_000n, 1);
    expect([mayPayFee(1000), mayPayFee(1001), mayPayFee(1002)]).toEqual([true, true, false]);
    expect(mayPayRent(["fresh"], 1003)).toBe(false);
    expect(mayPayFee(1000 + 120_000)).toBe(true);
  });
});
