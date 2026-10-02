import { pawIcon } from "@/server/card";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The paw on a sun-soft square: the icon an iPhone home screen shows. */
export default function Icon() {
  return pawIcon(size.width);
}
