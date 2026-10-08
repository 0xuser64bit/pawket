import type { ReactNode } from "react";

// The app's Mark links home with next/link; in the video it is only drawn.
export default function Link({ children, className }: { children?: ReactNode; className?: string; href?: unknown }) {
  return <span className={className}>{children}</span>;
}
