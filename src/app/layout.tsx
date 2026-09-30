import type { Metadata } from "next";
import "@/styles/globals.css";
import { getLocale, getTheme } from "@/i18n/server";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "agere/org" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
