"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, SlidersHorizontal, UserRound, UserX } from "lucide-react";
import { translator, type Locale } from "@/i18n";

const LINKS = [
  { href: "/pengaturan/profil", key: "settings.nav.profile", icon: <UserRound /> },
  { href: "/pengaturan/keamanan", key: "settings.nav.security", icon: <KeyRound /> },
  { href: "/pengaturan/preferensi", key: "settings.nav.preferences", icon: <SlidersHorizontal /> },
  { href: "/pengaturan/akun", key: "settings.nav.account", icon: <UserX /> },
] as const;

export function SettingsNav({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const path = usePathname();
  return (
    <nav aria-label={t("settings.title")} className="flex gap-1 overflow-x-auto md:grid">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={path === l.href ? "page" : undefined}
          className="flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-default hover:bg-emphasis focus-ring aria-[current=page]:bg-emphasis aria-[current=page]:font-medium aria-[current=page]:text-emphasis [&_svg]:size-4 [&_svg]:text-subtle"
        >
          {l.icon}
          {t(l.key)}
        </Link>
      ))}
    </nav>
  );
}
