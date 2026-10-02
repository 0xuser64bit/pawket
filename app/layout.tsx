import type { Metadata, Viewport } from "next";
import { getPublicEnv } from "@/config/env";
import { fontClassNames } from "@/config/fonts";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/config/site";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(getPublicEnv().appUrl),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE.charAt(0).toLowerCase()}${APP_TAGLINE.slice(1)}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  // Content may run under a notch or home indicator; the shell, the dock and
  // every band pad themselves with the safe-area insets instead.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efe2" },
    { media: "(prefers-color-scheme: dark)", color: "#17120e" },
  ],
};

/**
 * Daylight and Lamplight are the same room, so the theme follows the system
 * unless a player picked one. Applied before paint to avoid a flash of the
 * wrong room.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("pawket.theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontClassNames} suppressHydrationWarning>
      <head>
        {/* Lamplight is Pawket's own dark room, so Dark Reader is asked to stand
            down. Left on, it repaints the palette and rewrites every SVG's fill and
            stroke before React hydrates, which React reports as a mismatch. It reads
            this tag before it touches the page, so it must be in the served head. */}
        <meta name="darkreader-lock" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
