import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import path from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The paw on a sun-soft square: the icon an iPhone home screen shows. */
export default function Icon() {
  const mark = readFileSync(path.join(process.cwd(), "public/favicon.svg"));
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#ffe4cd" }}>
        <img src={`data:image/svg+xml;base64,${mark.toString("base64")}`} width={120} height={120} alt="" />
      </div>
    ),
    size,
  );
}
