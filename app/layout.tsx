import type { Metadata, Viewport } from "next";
import { getPublicEnv } from "@/config/env";
import { fontClassNames } from "@/config/fonts";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/config/site";
import { THEME_SCRIPT } from "@/config/themes";
import { PawketAnalytics } from "@/components/analytics";
import { BootSplash } from "@/components/pk/boot-splash";
import { Toasts } from "@/components/pk/toast";
import { NavProgress, OfflineNote } from "@/components/pk/nav-link";
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
        <meta name="darkreader-lock" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <noscript>
          <style>{".pk-boot{display:none}"}</style>
        </noscript>
      </head>
      <body>
        <BootSplash />
        <NavProgress />
        <OfflineNote />
        <Providers>{children}</Providers>
        <Toasts />
        <PawketAnalytics />
      </body>
    </html>
  );
}
