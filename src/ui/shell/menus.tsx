"use client";

// Organization switcher (PRD-02 §8: DropdownMenu, current organization named in the aria-label) and
// the account menu on the rail.
import * as React from "react";
import Link from "next/link";
import { Check, LogOut, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { translator } from "@/i18n";
import { signOutAction } from "@/app/(auth)/actions";

type T = ReturnType<typeof translator>;
type Org = { id: string; slug: string; name: string };

/** Organizations with unread items get a dot (PRD-10 §6), in the list and on the trigger. */
export function OrgSwitcher({ org, orgs, unreadOrgs, t, children }: { org: Org; orgs: Org[]; unreadOrgs: string[]; t: T; children: React.ReactNode }) {
  const elsewhere = orgs.some((o) => o.id !== org.id && unreadOrgs.includes(o.id));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("shell.switchOrg", org.name) + (elsewhere ? `, ${t("inbox.otherOrgs")}` : "")}
        className="relative mb-3 grid size-10 place-items-center rounded-lg focus-ring"
      >
        {children}
        {elsewhere && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-[hsl(var(--muted))]" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-64">
        <DropdownMenuLabel>{t("org.switcher.title")}</DropdownMenuLabel>
        {orgs.map((o) => (
          <DropdownMenuItem key={o.id} asChild>
            <Link href={`/${o.slug}`} aria-current={o.id === org.id ? "true" : undefined} className="flex items-center gap-2">
              <Avatar name={o.name} size="sm" shape="square" />
              <span className="flex-1 truncate">{o.name}</span>
              {o.id !== org.id && unreadOrgs.includes(o.id) && (
                <>
                  <span aria-hidden className="size-2 rounded-full bg-primary" />
                  <span className="sr-only">{t("inbox.hasUnread")}</span>
                </>
              )}
              {o.id === org.id && <Check aria-hidden className="size-4" />}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/buat-organisasi" className="flex items-center gap-2">
            <Plus aria-hidden className="size-4" />
            {t("org.create.title")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AccountMenu({ user, t, children }: { user: { name: string; email: string }; t: T; children: React.ReactNode }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={t("shell.account", user.name)} className="mt-2 rounded-full focus-ring">
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-64">
          <DropdownMenuLabel className="grid gap-0.5">
            <span className="truncate">{user.name}</span>
            <span className="truncate text-xs font-normal text-subtle">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => formRef.current?.requestSubmit()} className="flex items-center gap-2">
            <LogOut aria-hidden className="size-4" />
            {t("auth.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form ref={formRef} action={signOutAction} hidden />
    </>
  );
}
