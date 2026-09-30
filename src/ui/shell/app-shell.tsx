"use client";

// Shell (UI-01 "Navigasi ganda", "Aturan gulir shell", "Shell & aksesibilitas"): rail 68 px +
// contextual panel 256 px + inset content. Only #content scrolls. Ctrl+B hides the panel (hovering the
// rail then peeks it), Alt+1…n jumps to rail sections, below 768 px rail and panel become a drawer.
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Inbox, Layers, ListChecks, Menu, Moon, PanelLeft, Sun, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { IconButton } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { Logo } from "@/brand";
import { cn } from "@/lib/utils";
import { translator, type Locale } from "@/i18n";
import type { Role } from "@/lib/context";
import { AccountMenu, OrgSwitcher } from "./menus";
import { SpacePanel, type PanelSpace } from "@/ui/space/space-panel";
import { COOKIE, setPreferenceCookie } from "./cookies";
import { DESK_LINKS, manageHome, orgLinksFor, pageKey, RAIL, sectionOf, type NavLink, type SectionId } from "./nav";
import { useUnread } from "./unread";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { setThemeAction } from "@/app/pengaturan/actions";
import { formatDateShort } from "@/i18n/format";

const RAIL_ICON: Record<SectionId, React.ReactNode> = { desk: <Inbox />, space: <Layers />, manage: <Building2 /> };
const LINK_ICON: Record<string, React.ReactNode> = { "desk/kotak-masuk": <Inbox />, "desk/tugas-saya": <ListChecks /> };

export type ShellOrg = { id: string; slug: string; name: string };
export type FocusTask = { id: string; title: string; href: string; dueDate: string; today: boolean };
type Props = {
  org: ShellOrg;
  user: { name: string; email: string; avatar?: string };
  role: Role;
  orgs: (ShellOrg & { role: Role })[];
  /** Spaces and projects the viewer can open; null without Space access. */
  spaces: PanelSpace[] | null;
  /** Desk badge (PRD-10 §6), other organizations with unread items, and "Fokus hari ini". */
  unread: number;
  unreadOrgs: string[];
  focus: FocusTask[];
  locale: Locale;
  theme: "light" | "dark";
  panelHidden: boolean;
  children: React.ReactNode;
};

export function AppShell({ org, user, role, orgs, spaces, unread: initialUnread, unreadOrgs, focus, locale, theme: initialTheme, panelHidden, children }: Props) {
  const t = translator(locale);
  const router = useRouter();
  const base = `/${org.slug}`;
  const path = (usePathname() ?? base).slice(base.length + 1);
  const section = sectionOf(path);
  const unread = useUnread(base, initialUnread, path);
  const [collapsed, setCollapsed] = React.useState(panelHidden);
  const [peek, setPeek] = React.useState(false);
  // The drawer belongs to the page it was opened on, so navigating closes it.
  const [drawerPath, setDrawerPath] = React.useState<string | null>(null);
  const drawer = drawerPath === path;
  const setDrawer = (open: boolean) => setDrawerPath(open ? path : null);
  // The rendered theme lives on <html data-theme> ("Ikuti sistem" is decided there before paint).
  const theme = React.useSyncExternalStore(
    (notify) => {
      const o = new MutationObserver(notify);
      o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => o.disconnect();
    },
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => initialTheme,
  );
  const [shortcuts, setShortcuts] = React.useState(false);
  const peekTimer = React.useRef<number | undefined>(undefined);

  const toggleCollapsed = React.useCallback(() => {
    setPreferenceCookie(COOKIE.panel, collapsed ? "shown" : "hidden");
    setCollapsed(!collapsed);
    setPeek(false);
  }, [collapsed]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      if (e.ctrlKey && !e.altKey && e.key === "/" && !typing) {
        e.preventDefault();
        setShortcuts((x) => !x);
      } else if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === "b" && !typing) {
        e.preventDefault();
        toggleCollapsed();
      } else if (e.altKey && !e.ctrlKey && /^Digit[1-9]$/.test(e.code)) {
        const item = RAIL[Number(e.code.slice(5)) - 1];
        if (item) {
          e.preventDefault();
          router.push(`${base}/${item.path}`);
        }
      } else if (e.key === "Escape") {
        setDrawerPath(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [base, router, toggleCollapsed]);

  // The header toggle picks Terang or Gelap and saves it as the preference (PRD-12 §5.3).
  const switchTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    void setThemeAction(next);
  };

  const startPeek = () => {
    if (!collapsed) return;
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeek(true), 180);
  };
  const endPeek = () => {
    window.clearTimeout(peekTimer.current);
    setPeek(false);
  };

  const railLink = (id: SectionId, label: string, href: string, index?: number) => (
    <SimpleTooltip key={id} side="right" content={index === undefined ? label : `${label} · Alt+${index + 1}`}>
      <Link
        href={href}
        aria-current={section === id ? "page" : undefined}
        onMouseEnter={startPeek}
        className="group flex w-14 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium leading-[14px] text-subtle hover:text-emphasis focus-ring aria-[current=page]:text-emphasis"
      >
        <span className="relative grid h-[30px] w-9 place-items-center rounded-md transition-colors group-hover:bg-emphasis group-aria-[current=page]:bg-default group-aria-[current=page]:shadow-elevation-2 [&_svg]:size-[19px]">
          {RAIL_ICON[id]}
          {id === "desk" && unread > 0 && (
            <span aria-hidden className="absolute -right-1.5 -top-1 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-[18px] text-primary-foreground tabular-nums">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </span>
        <span className="[@media(max-height:759px)]:hidden">{label}</span>
        {id === "desk" && unread > 0 && <span className="sr-only">{t("inbox.badge", String(unread))}</span>}
      </Link>
    </SimpleTooltip>
  );

  const crumbs = [{ label: t(RAIL.find((r) => r.id === section)?.key ?? "nav.manage") }];
  const current = pageKey(path);
  if (current) crumbs.push({ label: t(current) });

  const panelOpen = !collapsed || peek;

  return (
    <div className="flex h-dvh overflow-hidden bg-muted text-foreground">
      <a href="#content" className="fixed left-2 top-[-60px] z-toast rounded-md bg-inverted px-3 py-2 text-sm text-inverted focus:top-2">
        {t("shell.skip")}
      </a>

      {drawer && <div className="fixed inset-0 z-header bg-overlay/50 md:hidden" onClick={() => setDrawer(false)} aria-hidden />}

      <div
        onMouseLeave={endPeek}
        className={cn(
          "fixed inset-y-0 left-0 z-drawer flex -translate-x-full transition-transform duration-moderate ease-emphasized md:static md:translate-x-0",
          drawer && "translate-x-0",
        )}
      >
        <nav aria-label={t("shell.apps")} className="flex w-[68px] flex-none flex-col items-center gap-1 bg-muted py-3">
          <OrgSwitcher org={org} orgs={orgs} unreadOrgs={unreadOrgs} t={t}>
            <Logo variant="app-icon" height={40} title="" />
          </OrgSwitcher>
          {RAIL.map((r, i) => railLink(r.id, t(r.key), `${base}/${r.path}`, i))}
          <span className="flex-1" />
          {railLink("manage", t("nav.manage"), `${base}/${manageHome(role)}`)}
          <AccountMenu user={user} t={t} onShortcuts={() => setShortcuts(true)}>
            <Avatar name={user.name} src={user.avatar} size="md" className="bg-emphasis" />
          </AccountMenu>
        </nav>

        <aside
          className={cn(
            "flex w-64 min-w-0 flex-col overflow-hidden bg-muted",
            !panelOpen && "md:hidden",
            collapsed && peek && "md:fixed md:inset-y-2 md:left-[68px] md:z-popover md:rounded-xl md:border md:border-default md:bg-default md:shadow-elevation-5",
          )}
        >
          <div className="flex h-14 flex-none items-center gap-1 pl-4 pr-2">
            <h2 className="type-heading-sm flex-1 truncate text-emphasis">{t(RAIL.find((r) => r.id === section)?.key ?? "nav.manage")}</h2>
            <IconButton className="md:hidden" size="sm" label={t("shell.closeMenu")} icon={<X />} onClick={() => setDrawer(false)} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            <ContextPanel section={section} base={base} path={path} role={role} t={t} spaces={spaces} orgId={org.id} focus={focus} locale={locale} />
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 p-0 md:py-2 md:pr-2">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-default md:rounded-xl md:border md:border-default md:shadow-elevation-1">
          <header className="flex h-14 flex-none items-center gap-2 border-b border-default px-3">
            <IconButton className="md:hidden" label={t("shell.openMenu")} icon={<Menu />} onClick={() => setDrawer(true)} />
            <IconButton
              className="hidden md:inline-flex"
              label={t(collapsed ? "shell.showPanel" : "shell.hidePanel")}
              icon={<PanelLeft />}
              aria-pressed={!collapsed}
              onClick={toggleCollapsed}
            />
            <span className="mx-1 hidden h-5 w-px bg-border md:block" aria-hidden />
            <Breadcrumb className="min-w-0 flex-1" items={crumbs} />
            <IconButton
              label={t(theme === "dark" ? "shell.lightTheme" : "shell.darkTheme")}
              icon={theme === "dark" ? <Sun /> : <Moon />}
              onClick={switchTheme}
            />
          </header>
          <main id="content" tabIndex={-1} className="min-h-0 flex-1 overflow-auto outline-none">
            {children}
          </main>
          <ShortcutsDialog t={t} open={shortcuts} onOpenChange={setShortcuts} />
        </div>
      </div>
    </div>
  );
}

type PanelProps = { section: SectionId; base: string; path: string; role: Role; t: ReturnType<typeof translator>; spaces: PanelSpace[] | null; orgId: string; focus: FocusTask[]; locale: Locale };

function ContextPanel({ section, base, path, role, t, spaces, orgId, focus, locale }: PanelProps) {
  const item = (l: NavLink) => (
    <Link
      key={l.path}
      href={`${base}/${l.path}`}
      aria-current={path === l.path ? "page" : undefined}
      className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-default hover:bg-emphasis focus-ring aria-[current=page]:bg-emphasis aria-[current=page]:font-medium aria-[current=page]:text-emphasis [&_svg]:size-4 [&_svg]:text-subtle"
    >
      {LINK_ICON[l.path]}
      <span className="truncate">{t(l.key)}</span>
    </Link>
  );
  const group = (label: string) => <p className="mb-1 mt-4 px-2 text-xs font-medium text-subtle">{label}</p>;

  if (section === "desk")
    return (
      <nav aria-label={t("nav.deskNav")}>
        {DESK_LINKS.map(item)}
        {/* Fokus hari ini (PRD-10 v1.3): my open tasks due today or tomorrow, at most 4. */}
        {group(t("desk.focus"))}
        {focus.length === 0 ? (
          <p className="px-2 text-xs text-subtle">{t("desk.focusEmpty")}</p>
        ) : (
          <ul className="grid gap-0.5">
            {focus.map((f) => (
              <li key={f.id}>
                <Link href={f.href} className="grid rounded-md px-2 py-1.5 text-sm hover:bg-emphasis focus-ring">
                  <span className="truncate text-default">{f.title}</span>
                  <span className={cn("text-xs", f.today ? "text-attention-on-surface" : "text-subtle")}>
                    {f.today ? t("date.today") : t("date.tomorrow")} · {formatDateShort(locale, new Date(`${f.dueDate}T00:00:00Z`), "UTC")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
    );
  if (section === "space") return <SpacePanel t={t} base={base} path={path} spaces={spaces} orgId={orgId} />;
  return (
    <nav aria-label={t("nav.manageNav")}>
      {group(t("nav.organization"))}
      {orgLinksFor(role).map(item)}
    </nav>
  );
}
