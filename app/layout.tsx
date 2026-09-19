import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
