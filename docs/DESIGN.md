# Pawket — Design (night den)

Operate mode: the visitor adopts, cares, and transacts. Scanability and task
flow outrank expression; brand lives in precise details.

## World

A cozy night den. Deep ink-plum canvas (`#0b0916`) with faint indigo, ember,
and sky glows; glass cards (`white/5`, `white/10` borders); one accent —
firefly amber (`amber-300`) — reserved for primary actions, progress, and the
companion's glow. Slate text scale for everything else. No gradients on text,
no second accent.

## Signature

The companion chamber breathes: a slow 5s glow pulse (`den-breathe` in
`app/globals.css`) around the portrait. The only animation on the page.

## Components

- Cards: `rounded-3xl border-white/10 bg-white/5`, section eyebrow in amber
  uppercase tracking, `text-2xl/3xl font-bold` titles, `slate-400` body copy.
- Primary CTAs: `bg-amber-300 text-slate-950 font-bold`, hover `amber-200`,
  `opacity-40` disabled. Secondary: `white/5` surfaces, `white/15` borders.
- Inputs: `rounded-xl border-white/15 bg-white/5`, amber focus ring,
  `rose-300` inline errors with `role="alert"`.
- Status: `TransactionStatus` is the only tx surface (emerald confirmed,
  amber unknown + no-blind-resend warning, rose failed).
- Avatar: deterministic SVG (`pet-avatar.tsx`) — species sets palette and
  ears, mood sets eyes/mouth, personality sets the chest mark.

## Rules

- Dark only (`color-scheme: dark`). New surfaces copy the chamber's card, not
  a new invention.
- Amber means action or life. Never decorative amber, never a second hue for
  emphasis.
- Every send flow uses `useSendTransaction` + `TransactionStatus`. No ad-hoc
  signature markup.
- Motion: breathe only. `prefers-reduced-motion` collapses all animation
  globally. Focus is always visible (amber outline).
