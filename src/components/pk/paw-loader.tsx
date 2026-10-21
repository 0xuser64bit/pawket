import { PawGlyph } from "./art";

export function PawLoader({ size = "md", label = "Loading" }: { size?: "sm" | "md"; label?: string }) {
  return (
    <div className="pk-paw-loader" role="status">
      <PawGlyph size={size === "sm" ? 40 : 88} moving />
      <span className="pk-sr">{label}</span>
    </div>
  );
}

export function Waiting({ label, inline = false }: { label: string; inline?: boolean }) {
  return (
    <div className={inline ? "pk-waiting" : "pk-waiting pk-waiting--page"}>
      <PawLoader size={inline ? "sm" : "md"} label={label} />
      <p className="body-sm pk-faint" aria-hidden="true">
        {label}
      </p>
    </div>
  );
}
