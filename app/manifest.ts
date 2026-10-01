import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/config/site";

/** Installable: a pet you check on every day belongs on the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — ${APP_TAGLINE.toLowerCase()}`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/home",
    display: "standalone",
    background_color: "#f6efe2",
    theme_color: "#f6efe2",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
