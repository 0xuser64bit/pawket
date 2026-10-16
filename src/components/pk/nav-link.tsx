"use client";

import NextLink, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

/** Keep the destination in view while Next waits for a route or its first chunk. */
export function NavLink({ children, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} data-navigation="">{children}<Pending /></NextLink>;
}

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className="pk-link-pending" role="status">
      <span className="pk-spinner" aria-hidden="true" />
      <span className="pk-sr">Opening page</span>
    </span>
  ) : null;
}
