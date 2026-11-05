// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { proxy } from "../proxy";

afterEach(() => vi.unstubAllEnvs());

it("replaces a supplied nonce with a fresh script policy shared by renderer and browser", () => {
  vi.stubEnv("NODE_ENV", "production");
  const request = () => new NextRequest("https://pawket.world/home", { headers: { "x-nonce": "attacker", "Content-Security-Policy": "script-src *" } });
  const first = proxy(request());
  const policy = first.headers.get("Content-Security-Policy")!;
  const nonce = first.headers.get("x-middleware-request-x-nonce")!;
  expect(nonce).toMatch(/^[A-Za-z0-9+/=]{24,}$/);
  expect(nonce).not.toBe("attacker");
  expect(policy).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
  expect(policy).not.toContain("'unsafe-eval'");
  expect(policy).toContain("'wasm-unsafe-eval'");
  expect(policy.split(";").find((part) => part.trim().startsWith("connect-src"))).toContain("blob:");
  expect(policy.split(";").find((part) => part.trim().startsWith("script-src"))).not.toContain("'unsafe-inline'");
  expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
  expect(proxy(request()).headers.get("x-middleware-request-x-nonce")).not.toBe(nonce);
  expect(policy).toContain("frame-src 'self' solana-wallet:");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("base-uri 'none'");
});

it("permits framework development evaluation only in development", () => {
  vi.stubEnv("NODE_ENV", "development");
  expect(proxy(new NextRequest("http://localhost:3000/home")).headers.get("Content-Security-Policy")).toContain("'unsafe-eval'");
});
