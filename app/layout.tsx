import type { Metadata, Viewport } from "next";
import { getPublicEnv } from "@/config/env";
import { fontClassNames } from "@/config/fonts";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/config/site";
import { THEME_SCRIPT } from "@/config/themes";
import { PawketAnalytics } from "@/components/analytics";
import { BootSplash } from "@/components/pk/boot-splash";
import { Toasts } from "@/components/pk/toast";
import { NavProgress } from "@/components/pk/nav-link";
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
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efe2" },
    { media: "(prefers-color-scheme: dark)", color: "#17120e" },
  ],
};


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
        {/* The room a player picked, applied before paint so the wrong one never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Without a script nothing would ever lift the splash, so it is never drawn. */}
        <noscript>
          <style>{".pk-boot{display:none}"}</style>
        </noscript>
      </head>
      <body>
        <BootSplash />
        <NavProgress />
        <Providers>{children}</Providers>
        <Toasts />
        <PawketAnalytics />
      </body>
    </html>
  );
}
