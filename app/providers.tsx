"use client";

import type { ReactNode } from "react";
import { useBarsFollowRoom } from "@/lib/native/android";

export default function Providers({ children }: { children: ReactNode }) {
  useBarsFollowRoom();
  return children;
}
