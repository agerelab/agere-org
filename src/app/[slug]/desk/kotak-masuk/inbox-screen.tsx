"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Bell, Check, CheckCheck, FolderKanban, ListChecks, Sparkles, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { addDays } from "@/lib/dates";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { formatDateShort, formatTime } from "@/i18n/format";
import type { Inbox } from "@/modules/notifications";
import { SENTENCE_VARS, type InboxItem, type InboxTab } from "@/modules/notifications/types";
import { PageFrame } from "@/ui/shell/page-frame";
import { announceUnreadChanged } from "@/ui/shell/unread";
import { archiveAction, markAllReadAction, markReadAction } from "../actions";

type T = ReturnType<typeof translator>;
const TABS: { id: InboxTab; key: MessageKey }[] = [
  { id: "all", key: "inbox.tab.all" },
  { id: "unread", key: "inbox.tab.unread" },
  { id: "forMe", key: "inbox.tab.forMe" },
];

/** A variable as the reader should see it: roles, statuses and app ids are translated (D45). */
function show(t: T, key: string, value: string | number) {
  if (key === "role") return t(`role.${value}` as MessageKey);
  if (key === "status") return t(`status.${value}` as MessageKey);
  if (key === "app") return value === "space" ? "Space" : String(value);
  return String(value);
}

/** The sentence with its names in bold ("**Rina** menugaskan **Riset harga** kepada Anda"). */
function Sentence({ t, item }: { t: T; item: InboxItem }) {
  const names = SENTENCE_VARS[item.kind];
  // Keep the placeholders so each name can be set in bold.
  const template = t(`notif.${item.kind}` as MessageKey, ...names.map((_, i) => `{${i}}`));
  return (
    <>
      {template.split(/(\{\d\})/).map((part, i) => {
        const m = /^\{(\d)\}$/.exec(part);
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
        const key = names[Number(m[1])];
        return <strong key={i} className="font-semibold">{show(t, key, item.vars[key] ?? "—")}</strong>;
      })}
    </>
  );
}

function Welcome({ t, slug, orgId, orgName }: { t: T; slug: string; orgId: string; orgName: string }) {
  const key = `agere:welcome:${orgId}`;
  const [hidden, setHidden] = React.useState(true);
  React.useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(key) === "1";
    } catch {}
    const id = window.setTimeout(() => setHidden(dismissed), 0);
    return () => window.clearTimeout(id);
  }, [key]);
  if (hidden) return null;
  const close = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {}
    setHidden(true);
  };
  const steps: { href: string; icon: React.ReactNode; label: MessageKey }[] = [
    { href: `/${slug}/s`, icon: <FolderKanban />, label: "welcome.step.project" },
    { href: `/${slug}/organisasi/anggota`, icon: <UserPlus />, label: "welcome.step.invite" },
    { href: `/${slug}/desk/tugas-saya`, icon: <ListChecks />, label: "welcome.step.tasks" },
  ];
  return (
    <section aria-labelledby="welcome-title" className="relative grid gap-3 rounded-xl border border-default bg-card p-5">
      <IconButton size="sm" variant="ghost" label={t("common.close")} icon={<X />} onClick={close} className="absolute right-3 top-3" />
      <h2 id="welcome-title" className="flex items-center gap-2 pr-10 text-base font-semibold text-emphasis">
        <Sparkles aria-hidden className="size-4" />
        {t("welcome.title", orgName)}
      </h2>
      <p className="text-sm text-subtle">{t("welcome.body")}</p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm text-emphasis hover:bg-subtle focus-ring [&_svg]:size-4 [&_svg]:text-subtle">
              {s.icon}
              {t(s.label)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InboxScreen({
  slug,
  locale,
  title,
  tab,
  limit,
  data,
  timezone,
  today,
  welcome,
}: {
  slug: string;
  locale: Locale;
  title: string;
  tab: InboxTab;
  limit: number;
  data: Inbox;
  timezone: string;
  today: string;
  welcome: { orgId: string; orgName: string } | null;
}) {
  const t = translator(locale);
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [gone, setGone] = React.useState<Set<string>>(new Set());
  const [read, setRead] = React.useState<Set<string>>(new Set());
  const items = data.items.filter((i) => !gone.has(i.id)).map((i) => (read.has(i.id) ? { ...i, read: true } : i));
  const unread = data.counts.unread - data.items.filter((i) => !i.read && (gone.has(i.id) || read.has(i.id))).length;
  const base = `/${slug}/desk/kotak-masuk`;

  const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  const yesterday = addDays(today, -1);
  const groups: { key: MessageKey; rows: InboxItem[] }[] = [
    { key: "inbox.group.today", rows: items.filter((i) => dayOf(i.createdAt) === today) },
    { key: "inbox.group.yesterday", rows: items.filter((i) => dayOf(i.createdAt) === yesterday) },
    { key: "inbox.group.earlier", rows: items.filter((i) => dayOf(i.createdAt) < yesterday) },
  ];

  const after = () => {
    announceUnreadChanged();
    router.refresh();
  };
  const markOne = (id: string) =>
    start(async () => {
      setRead((s) => new Set(s).add(id));
      await markReadAction(slug, id);
      after();
    });
  const archiveOne = (id: string) =>
    start(async () => {
      setGone((s) => new Set(s).add(id));
      await archiveAction(slug, id);
      toast.success(t("inbox.archived"));
      after();
    });
  const markAll = () =>
    start(async () => {
      setRead(new Set(data.items.map((i) => i.id)));
      await markAllReadAction(slug);
      after();
    });

  const description = unread > 0 ? t("inbox.unreadCount", String(unread)) : t("inbox.allRead");

  return (
    <PageFrame
      title={title}
      description={description}
      width="read"
      actions={unread > 0 ? <Button variant="outline" onClick={markAll} disabled={pending}><CheckCheck aria-hidden />{t("inbox.markAll")}</Button> : undefined}
    >
      <div className="grid gap-6">
        {welcome && <Welcome t={t} slug={slug} orgId={welcome.orgId} orgName={welcome.orgName} />}
        <nav aria-label={t("inbox.tabs")} className="flex items-center gap-5 border-b border-default">
          {TABS.map((x) => (
            <Link
              key={x.id}
              href={x.id === "all" ? base : `${base}?tab=${x.id}`}
              aria-current={tab === x.id ? "page" : undefined}
              className={cn("inline-flex h-10 items-center gap-1.5 border-b-2 px-1 text-sm font-medium focus-ring", tab === x.id ? "border-foreground text-emphasis" : "border-transparent text-subtle hover:text-emphasis")}
            >
              {t(x.key)}
              <span className="rounded-full bg-subtle px-1.5 text-xs tabular-nums text-subtle">{x.id === "unread" ? unread : data.counts[x.id]}</span>
            </Link>
          ))}
        </nav>

        {items.length === 0 ? (
          <EmptyState icon={<Check />} headingLevel="h2" title={t("inbox.emptyTitle")} description={t(tab === "unread" ? "inbox.emptyUnread" : "inbox.emptyBody")} />
        ) : (
          groups
            .filter((g) => g.rows.length)
            .map((g) => (
              <section key={g.key} aria-labelledby={g.key}>
                <h2 id={g.key} className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">{t(g.key)}</h2>
                <ul className="divide-y divide-[hsl(var(--border))] rounded-xl border border-default">
                  {g.rows.map((item) => (
                    <li key={item.id} className="group/row relative flex items-start gap-3 px-4 py-3 hover:bg-subtle">
                      <span aria-hidden className={cn("mt-3 size-2 shrink-0 rounded-full", item.read ? "bg-transparent" : "bg-primary")} />
                      {item.actorName ? (
                        <Avatar name={item.actorName} size="md" aria-hidden />
                      ) : (
                        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle text-subtle">
                          <Bell className="size-4" />
                        </span>
                      )}
                      <Link
                        href={`${base}/buka/${item.id}`}
                        prefetch={false}
                        className="min-w-0 flex-1 rounded-sm focus-ring after:absolute after:inset-0"
                        onClick={() => {
                          if (!item.read) announceUnreadChanged();
                        }}
                      >
                        {!item.read && <span className="sr-only">{t("inbox.unread")}: </span>}
                        <span className={cn("block text-sm", item.read ? "text-subtle" : "text-emphasis")}>
                          <Sentence t={t} item={item} />
                        </span>
                        <span className="mt-0.5 block text-xs text-subtle">
                          {t(`notif.label.${item.kind}` as MessageKey)} · {formatDateShort(locale, new Date(item.createdAt), timezone)} {formatTime(locale, new Date(item.createdAt), timezone)}
                        </span>
                      </Link>
                      <span className="relative z-10 flex shrink-0 gap-1 opacity-0 focus-within:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100">
                        {!item.read && <IconButton size="sm" variant="ghost" label={t("inbox.markRead")} icon={<Check />} onClick={() => markOne(item.id)} />}
                        <IconButton size="sm" variant="ghost" label={t("inbox.archive")} icon={<Archive />} onClick={() => archiveOne(item.id)} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
        )}
        {data.hasMore && (
          <Button asChild variant="outline" className="justify-self-center">
            <Link href={`${base}?${tab === "all" ? "" : `tab=${tab}&`}n=${limit + 50}`} scroll={false}>{t("inbox.more")}</Link>
          </Button>
        )}
      </div>
    </PageFrame>
  );
}
