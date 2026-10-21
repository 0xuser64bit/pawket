import type { PetForm } from "@/components/pk";

const INK = { stroke: "var(--edge)", strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" } as const;

function Art({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <g {...INK}>{children}</g>
    </svg>
  );
}

export function Treat({ form, className }: { form: PetForm; className?: string }) {
  if (form === "cat") {
    return (
      <Art className={className}>
        <path d="M10 32c8-12 24-14 34-4l10-8v24l-10-8c-10 10-26 8-34-4z" fill="var(--pool)" />
        <path d="M30 24c3 5 3 11 0 16" stroke="var(--pool-edge)" />
        <circle cx="19" cy="30" r="2.4" fill="var(--pet-eye)" stroke="none" />
      </Art>
    );
  }
  if (form === "dog") {
    return (
      <Art className={className}>
        <path d="M18 22a7 7 0 1 1 8-8l14 14a7 7 0 1 1 8 8 7 7 0 1 1-8 8L26 30a7 7 0 1 1-8-8z" fill="var(--pet-cream)" transform="rotate(-8 32 32)" />
      </Art>
    );
  }
  return (
    <Art className={className}>
      <path d="M40 22 18 50c-2 3 1 6 4 4l26-24z" fill="var(--sun)" />
      <path d="M26 42l4 3M31 36l4 3" stroke="var(--sun-edge)" />
      <path d="M42 22c-2-6 0-12 6-14 0 6-2 10-6 14zM44 24c4-4 10-5 14-2-4 4-9 4-14 2z" fill="var(--sprout)" />
    </Art>
  );
}

export function Star({ className }: { className?: string }) {
  return (
    <Art className={className}>
      <path d="M32 6l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 44.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z" fill="var(--trim-foil)" />
      <path d="M28 20l2 4" stroke="var(--pet-shine)" />
    </Art>
  );
}

export function RainCloud({ className }: { className?: string }) {
  return (
    <Art className={className}>
      <path d="M14 38c-6 0-9-5-7-10 2-4 6-5 9-4 1-7 7-11 14-10 5 1 9 5 10 10 5-1 10 2 11 7 1 4-2 7-6 7z" fill="var(--pool-edge)" />
      <path d="M33 38l-6 10h7l-4 10 11-14h-7l3-6z" fill="var(--sun)" strokeWidth="2.4" />
      <path d="M17 46l-3 7M48 46l-3 7" stroke="var(--pool)" />
      <path d="M22 27l4 2M42 27l-4 2" stroke="var(--pet-cream)" strokeWidth="2.6" />
      <path d="M27 34c2-1.6 4-1.6 6 0" stroke="var(--pet-cream)" strokeWidth="2.6" />
    </Art>
  );
}

export function Heart({ className }: { className?: string }) {
  return (
    <Art className={className}>
      <path d="M32 54C18 45 9 37 9 27c0-7 5-12 12-12 5 0 8.6 2.6 11 6.6C34.4 17.6 38 15 43 15c7 0 12 5 12 12 0 10-9 18-23 27z" fill="var(--pet-blush)" />
      <path d="M19 25c1-3 3-4 6-4" stroke="var(--pet-shine)" />
    </Art>
  );
}

export function Obstacle({ kind, className }: { kind: "pot" | "puddle" | "log"; className?: string }) {
  if (kind === "pot") {
    return (
      <svg viewBox="0 0 40 80" fill="none" aria-hidden="true" className={className} preserveAspectRatio="none">
        <g {...INK}>
          <path d="M20 40c-2-12-10-20-18-18 2 10 9 16 18 18zM20 40c0-14 6-24 16-26 0 12-6 22-16 26z" fill="var(--sprout)" />
          <path d="M5 46h30l-4 32H9z" fill="var(--trim-copper)" />
          <path d="M3 40h34v8H3z" fill="var(--trim-copper)" />
        </g>
      </svg>
    );
  }
  if (kind === "log") {
    return (
      <svg viewBox="0 0 64 52" fill="none" aria-hidden="true" className={className} preserveAspectRatio="none">
        <g {...INK}>
          <rect x="4" y="12" width="56" height="38" rx="14" fill="var(--trim-copper)" />
          <ellipse cx="18" cy="31" rx="10" ry="16" fill="var(--pet-cream)" />
          <ellipse cx="18" cy="31" rx="4" ry="7" stroke="var(--trim-copper)" />
          <path d="M34 22h16M38 40h14" stroke="var(--sun-edge)" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 16" fill="none" aria-hidden="true" className={className} preserveAspectRatio="none">
      <g {...INK}>
        <ellipse cx="40" cy="9" rx="37" ry="6" fill="var(--pool)" />
        <path d="M22 8c4-2 8-2 12 0" stroke="var(--pool-soft)" />
      </g>
    </svg>
  );
}
