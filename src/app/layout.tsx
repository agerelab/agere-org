import type { Metadata } from "next";
import "@/styles/globals.css";
import { getLocale, getThemePreference } from "@/i18n/server";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "agere/org" };

// "Ikuti sistem" (PRD-12 §5.3): set data-theme from the OS before the first paint, so there is no flash.
const FOLLOW_SYSTEM = `try{document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getThemePreference()]);
  return (
    <html lang={locale} data-theme={theme === "dark" ? "dark" : "light"} data-theme-pref={theme} suppressHydrationWarning>
      <head>{theme === "system" && <script dangerouslySetInnerHTML={{ __html: FOLLOW_SYSTEM }} />}</head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
