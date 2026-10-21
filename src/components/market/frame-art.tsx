import { useId, type ReactNode } from "react";
import type { PhotoFrameId } from "@/lib/market/frames";

export function FrameArt({ id, className }: { id: PhotoFrameId; className?: string }) {
  const clip = useId();
  const square = id === "postcard" || id === "film" || id === "polaroid";
  const r = square ? 0 : 6;
  const thick = id === "sunshine" || id === "film" || id === "starry";
  const stroke =
    id === "sunshine" ? "var(--sun)" : id === "garden" ? "var(--sprout)" : id === "hearts" ? "var(--pet-blush)" : id === "starry" ? "var(--pool)" : "var(--edge)";
  const [x, y, w, h] = [16, 12, 68, 56];
  let extra: ReactNode = null;
  switch (id) {
    case "postcard":
      extra = <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="none" stroke="var(--edge)" strokeWidth="1.4" />;
      break;
    case "film":
      extra = (
        <g fill="var(--surface)">
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={x - 1.6} y={y + 6 + i * 13} width="3.2" height="6" />
              <rect x={x + w - 1.6} y={y + 6 + i * 13} width="3.2" height="6" />
            </g>
          ))}
        </g>
      );
      break;
    case "garden":
      extra = (
        <g fill="var(--sprout)">
          {[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              {[0, 1, 2, 3, 4].map((petal) => (
                <circle key={petal} cx={cx + Math.cos((petal * Math.PI * 2) / 5) * 3.4} cy={cy + Math.sin((petal * Math.PI * 2) / 5) * 3.4} r="2.6" />
              ))}
            </g>
          ))}
        </g>
      );
      break;
    case "polaroid":
      extra = <rect x="38" y={y - 5} width="24" height="9" transform={`rotate(-3 50 ${y})`} fill="var(--surface)" fillOpacity="0.85" stroke="var(--ink-faint)" strokeWidth="0.8" />;
      break;
    case "hearts":
      extra = (
        <g fill="var(--pet-blush)" stroke="var(--edge)" strokeWidth="1.2">
          {[[x, y, 6], [x + w, y, 6], [x, y + h, 6], [x + w, y + h, 6], [50, y, 4.4], [50, y + h, 4.4]].map(([cx, cy, s]) => (
            <path
              key={`${cx}-${cy}`}
              d={`M${cx} ${cy + s * 0.9}C${cx - s * 1.4} ${cy} ${cx - s * 0.8} ${cy - s * 1.1} ${cx} ${cy - s * 0.35}C${cx + s * 0.8} ${cy - s * 1.1} ${cx + s * 1.4} ${cy} ${cx} ${cy + s * 0.9}z`}
            />
          ))}
        </g>
      );
      break;
    case "starry":
      extra = (
        <g fill="var(--trim-foil)" stroke="var(--edge)" strokeWidth="0.6">
          {[[28, y], [52, y], [74, y], [40, y + h], [64, y + h], [x, 30], [x, 54], [x + w, 38], [x + w, 60]].map(([cx, cy]) => (
            <path
              key={`${cx}-${cy}`}
              d={Array.from({ length: 10 }, (_, i) => {
                const radius = i % 2 ? 1.3 : 3;
                const a = -Math.PI / 2 + (i * Math.PI) / 5;
                return `${i ? "L" : "M"}${(cx + Math.cos(a) * radius).toFixed(2)} ${(cy + Math.sin(a) * radius).toFixed(2)}`;
              }).join("") + "z"}
            />
          ))}
        </g>
      );
      break;
    case "confetti":
      extra = (
        <g stroke="var(--edge)" strokeWidth="0.6">
          {[
            [18, 10, "var(--sun)"], [34, 14, "var(--pool)"], [58, 9, "var(--sprout)"], [80, 13, "var(--pet-blush)"],
            [86, 30, "var(--sun)"], [82, 52, "var(--pool)"], [70, 70, "var(--sprout)"], [44, 66, "var(--pet-blush)"],
            [22, 70, "var(--sun)"], [13, 48, "var(--pool)"], [17, 26, "var(--sprout)"],
          ].map(([cx, cy, fill], i) =>
            i % 3 === 0 ? (
              <circle key={i} cx={cx} cy={cy} r="1.8" fill={fill as string} />
            ) : (
              <rect key={i} x={(cx as number) - 2.6} y={(cy as number) - 1.2} width="5.2" height="2.4" fill={fill as string} transform={`rotate(${i * 37} ${cx} ${cy})`} />
            ),
          )}
        </g>
      );
      break;
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="96" height="96" rx="4" fill="var(--surface)" stroke="var(--edge-soft)" strokeWidth="1.4" />
      <clipPath id={clip}>
        <rect x={x} y={y} width={w} height={h} rx={r} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x={x} y={y} width={w} height={h} fill="var(--sun-soft)" />
        <rect x={x} y={y + h * 0.66} width={w} height={h * 0.34} fill="var(--surface-sunk)" />
        <circle cx={x + w * 0.76} cy={y + h * 0.28} r="6" fill="var(--sun)" />
        <circle cx={x + w * 0.38} cy={y + h * 0.6} r="7" fill="var(--pool)" stroke="var(--edge)" strokeWidth="1.2" />
      </g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={stroke} strokeWidth={thick ? 5 : id === "polaroid" ? 1 : 1.6} />
      {extra}
      <rect x={x} y="78" width="34" height="5" rx="2.5" fill="var(--ink)" />
      <rect x={x} y="87" width="22" height="3.4" rx="1.7" fill="var(--ink-faint)" />
      <rect x={x + w - 14} y="85" width="14" height="5" rx="2.5" fill="var(--sun)" />
    </svg>
  );
}
