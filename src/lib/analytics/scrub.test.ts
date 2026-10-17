import { expect, it } from "vitest";
import { scrub, scrubPath } from "./scrub";

it("keeps credentials, addresses and long text out of a log line", () => {
  expect(scrub("fetch failed for https://devnet.helius-rpc.com/?api-key=secret123 (429)")).toBe("fetch failed for [url] (429)");
  expect(scrub("no pet at EFr1hjEsYCCYqT7XkM3yQaHn6DPw4b4cuWZcV2Lr9Pg8")).toBe("no pet at [address]");
  expect(scrub("0 ".repeat(200))).toHaveLength(300);
  expect(scrubPath("/pet/EFr1hjEsYCCYqT7XkM3yQaHn6DPw4b4cuWZcV2Lr9Pg8/visit?tab=1#top")).toBe("/pet/[address]/visit");
});
