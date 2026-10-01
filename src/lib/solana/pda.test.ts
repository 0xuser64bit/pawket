import { describe, expect, it } from "vitest";
import {
  derivePassportPda,
  derivePetPda,
  normalizePetName,
  SolanaValidationError,
} from "./pda";
import { PAWKET_PROGRAM_ID } from "./program";

const OWNER = "11111111111111111111111111111111";
const PROGRAM = PAWKET_PROGRAM_ID;

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

describe("PDA derivation", () => {
  it("derives the locked pet PDA for the fixture owner + name", async () => {
    const { address, bump } = await derivePetPda(OWNER, "Nova", PROGRAM);
    expect(String(address)).toBe("J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp");
    expect(bump).toBe(255);
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
    expect(String(address)).toBe("FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm");
    expect(bump).toBe(253);
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
