import type { Metadata } from "next";
import { cookies } from "next/headers";
import { resolveLocale } from "@/i18n";
import "./globals.css";

export const metadata: Metadata = { title: "agere/org" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Signed out: the language switcher's cookie, else English (TECH-01 F16). Signed-in pages
  // resolve user → organization → English once identity (PRD-01) and org (PRD-02) exist.
  const locale = resolveLocale((await cookies()).get("agere-lang")?.value);
  return (
    <html lang={locale} data-theme="light">
      <body>{children}</body>
    </html>
  );
}
