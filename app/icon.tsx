import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import path from "node:path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** The paw on a sun-soft square: the icon a home screen shows for Pawket. */
export default function Icon() {
  const mark = readFileSync(path.join(process.cwd(), "public/favicon.svg"));
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#ffe4cd" }}>
        <img src={`data:image/svg+xml;base64,${mark.toString("base64")}`} width={340} height={340} alt="" />
      </div>
    ),
    size,
  );
}
