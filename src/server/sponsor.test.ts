// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { caller } from "./actions";

async function sponsor() {
  vi.resetModules();
  return import("./sponsor");
}

const SOL = 1_000_000_000n;
const ONE_RENT = 3_500_000n;
const at = (ip: string | null) => new Request("http://localhost/api/sponsor", { headers: ip ? { "x-forwarded-for": ip } : {} });

describe("caller", () => {
  it("counts an IPv6 address by its /64 and an IPv4 address, mapped or not, as itself", () => {
    expect(caller(at("203.0.113.7, 10.0.0.1"))).toBe("203.0.113.7");
    expect(caller(at("::ffff:203.0.113.7"))).toBe("203.0.113.7");
    expect(caller(at("2001:db8:0:12::1"))).toBe("2001:db8:0:12::/64");
    expect(caller(at("2001:DB8:0000:0012:abcd:ef01:2345:6789"))).toBe("2001:db8:0:12::/64");
    expect(caller(at("2001:db8::"))).toBe("2001:db8:0:0::/64");
    expect(caller(at(null))).toBe("local");
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
