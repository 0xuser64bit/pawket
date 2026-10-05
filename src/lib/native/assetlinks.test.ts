import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Android app (android/gradle.properties) and the site's statement that
 * its links may open in that app (public/.well-known/assetlinks.json) name
 * the same package; the app opens Pawket over https only.
 */
const root = process.cwd();
const gradle = Object.fromEntries(
  readFileSync(join(root, "android/gradle.properties"), "utf8")
    .split("\n")
    .filter((line) => /^SOLANA_MOBILE_[A-Z_]+=/.test(line))
    .map((line) => line.split("=", 2) as [string, string]),
);
const statements = JSON.parse(readFileSync(join(root, "public/.well-known/assetlinks.json"), "utf8")) as Array<{
  relation: string[];
  target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
}>;
const shell = JSON.parse(readFileSync(join(root, "android/twa-manifest.json"), "utf8")) as {
  host: string;
  startUrl: string;
  packageId: string;
};

describe("the app and the site agree", () => {
  it("lets links open in the one package the build makes", () => {
    expect(statements).toHaveLength(1);
    const [statement] = statements;
    expect(statement.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
    expect(statement.target.namespace).toBe("android_app");
    expect(statement.target.package_name).toBe(gradle.SOLANA_MOBILE_APPLICATION_ID);
    for (const fingerprint of statement.target.sha256_cert_fingerprints) expect(fingerprint).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  });

  it("opens the official domain, with the CLI and APK using the same origin", () => {
    expect(gradle.SOLANA_MOBILE_URL).toBe("https://pawket.world/home");
    expect(new URL(shell.startUrl, `https://${shell.host}`).href).toBe(gradle.SOLANA_MOBILE_URL);
    expect(shell.packageId).toBe(gradle.SOLANA_MOBILE_APPLICATION_ID);
  });
});
