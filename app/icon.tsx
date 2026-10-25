import { pawIcon } from "@/server/card";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return pawIcon(size.width);
}
