import localFont from "next/font/local";

/**
 * The three families of the Pawket design system, each with one job:
 * Fraunces is the game's voice, Hanken Grotesk is everything you read,
 * DM Mono is anything verifiable. Loaded locally so a price never reflows.
 */

const display = localFont({
  src: "../fonts/Fraunces-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-display",
  fallback: ["Georgia", "serif"],
});

const text = localFont({
  src: "../fonts/HankenGrotesk-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-text",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const mono = localFont({
  src: [
    { path: "../fonts/DMMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/DMMono-Medium.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});

export const fontClassNames = `${display.variable} ${text.variable} ${mono.variable}`;
