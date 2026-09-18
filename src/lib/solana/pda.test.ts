import { describe, expect, it } from "vitest";
import {
  deriveGameConfigPda,
  derivePassportPda,
  derivePetPda,
  normalizePetName,
  normalizeSku,
  SolanaValidationError,
} from "./pda";

const OWNER = "11111111111111111111111111111111";
const PROGRAM = "FQwe9LUPMTrhYyr32mHPpX87tcpjr98Eamz9wJQDaSef";

describe("normalizePetName", () => {
  it("trims before measuring", () => {
    expect(normalizePetName("  Nova  ")).toBe("Nova");
  });

  it("rejects empty and over-long names", () => {
    expect(() => normalizePetName("A")).toThrow(SolanaValidationError);
    expect(() => normalizePetName("x".repeat(25))).toThrow(SolanaValidationError);
    expect(() => normalizePetName("   ")).toThrow(SolanaValidationError);
  });
});

describe("normalizeSku", () => {
  it("accepts 2–32 byte SKUs and rejects the rest", () => {
    expect(normalizeSku("egg_alpha")).toBe("egg_alpha");
    expect(() => normalizeSku("x")).toThrow(SolanaValidationError);
    expect(() => normalizeSku("x".repeat(33))).toThrow(SolanaValidationError);
  });
});

describe("PDA derivation", () => {
  it("derives the locked game-config PDA", async () => {
    const { address, bump } = await deriveGameConfigPda(PROGRAM);
    expect(String(address)).toBe("oRoeJ7buLDW1vbCtavT6YkZK61PdMH2YZEsYC4vW1W9");
    expect(bump).toBe(255);
  });

  it("derives the locked pet PDA for the fixture owner + name", async () => {
    const { address, bump } = await derivePetPda(OWNER, "Nova", PROGRAM);
    expect(String(address)).toBe("7C6FJ44NqBgJwnhjfKWeqRbqefVxWtv6GrcvyCwteCrF");
    expect(bump).toBe(254);
  });

  it("trims names before derivation (same PDA)", async () => {
    const a = await derivePetPda(OWNER, "Nova", PROGRAM);
    const b = await derivePetPda(OWNER, "   Nova   ", PROGRAM);
    expect(String(a.address)).toBe(String(b.address));
  });

  it("separates names (different PDA)", async () => {
    const a = await derivePetPda(OWNER, "Nova", PROGRAM);
    const b = await derivePetPda(OWNER, "Mochi", PROGRAM);
    expect(String(a.address)).not.toBe(String(b.address));
  });

  it("derives the locked passport PDA from the pet PDA", async () => {
    const pet = await derivePetPda(OWNER, "Nova", PROGRAM);
    const { address, bump } = await derivePassportPda(pet.address, PROGRAM);
    expect(String(address)).toBe("BvgKi517VzV7hKiRha6v4q5UrvR6FtZfYZ88WfPEqGmM");
    expect(bump).toBe(254);
  });

  it("rejects invalid addresses and names", async () => {
    await expect(derivePetPda("not-an-address", "Nova", PROGRAM)).rejects.toThrow(
      SolanaValidationError,
    );
    await expect(derivePetPda(OWNER, "x", PROGRAM)).rejects.toThrow(
      SolanaValidationError,
    );
  });
});
