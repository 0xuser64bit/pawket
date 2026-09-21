import type { Metadata, Viewport } from "next";
import { fontClassNames } from "@/config/fonts";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/config/site";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
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
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
