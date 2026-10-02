import { pawIcon } from "@/server/card";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** The paw on a sun-soft square: the icon a home screen shows for Pawket. */
export default function Icon() {
  return pawIcon(size.width);
}
