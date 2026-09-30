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

const RAIL_ICON: Record<SectionId, React.ReactNode> = { desk: <Inbox />, space: <Layers />, manage: <Building2 /> };
const LINK_ICON: Record<string, React.ReactNode> = { "desk/kotak-masuk": <Inbox />, "desk/tugas-saya": <ListChecks /> };

export type ShellOrg = { id: string; slug: string; name: string };
type Props = {
  org: ShellOrg;
  user: { name: string; email: string };
  role: Role;
  orgs: (ShellOrg & { role: Role })[];
  /** Spaces and projects the viewer can open; null without Space access. */
  spaces: PanelSpace[] | null;
  locale: Locale;
  theme: "light" | "dark";
  panelHidden: boolean;
  children: React.ReactNode;
};

export function AppShell({ org, user, role, orgs, spaces, locale, theme: initialTheme, panelHidden, children }: Props) {
  const t = translator(locale);
  const router = useRouter();
  const base = `/${org.slug}`;
  const path = (usePathname() ?? base).slice(base.length + 1);
  const section = sectionOf(path);
  const [collapsed, setCollapsed] = React.useState(panelHidden);
  const [peek, setPeek] = React.useState(false);
  // The drawer belongs to the page it was opened on, so navigating closes it.
  const [drawerPath, setDrawerPath] = React.useState<string | null>(null);
  const drawer = drawerPath === path;
  const setDrawer = (open: boolean) => setDrawerPath(open ? path : null);
  const [theme, setTheme] = React.useState(initialTheme);
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
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === "b" && !typing) {
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

  const switchTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    setPreferenceCookie(COOKIE.theme, next);
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
        <span className="grid h-[30px] w-9 place-items-center rounded-md transition-colors group-hover:bg-emphasis group-aria-[current=page]:bg-default group-aria-[current=page]:shadow-elevation-2 [&_svg]:size-[19px]">
          {RAIL_ICON[id]}
        </span>
        <span className="[@media(max-height:759px)]:hidden">{label}</span>
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
          <OrgSwitcher org={org} orgs={orgs} t={t}>
            <Logo variant="app-icon" height={40} title="" />
          </OrgSwitcher>
          {RAIL.map((r, i) => railLink(r.id, t(r.key), `${base}/${r.path}`, i))}
          <span className="flex-1" />
          {railLink("manage", t("nav.manage"), `${base}/${manageHome(role)}`)}
          <AccountMenu user={user} t={t}>
            <Avatar name={user.name} size="md" className="bg-emphasis" />
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
            <ContextPanel section={section} base={base} path={path} role={role} t={t} spaces={spaces} />
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
        </div>
      </div>
    </div>
  );
}

type PanelProps = { section: SectionId; base: string; path: string; role: Role; t: ReturnType<typeof translator>; spaces: PanelSpace[] | null };

function ContextPanel({ section, base, path, role, t, spaces }: PanelProps) {
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

  if (section === "desk") return <nav aria-label={t("nav.deskNav")}>{DESK_LINKS.map(item)}</nav>;
  if (section === "space") return <SpacePanel t={t} base={base} path={path} spaces={spaces} />;
  return (
    <nav aria-label={t("nav.manageNav")}>
      {group(t("nav.organization"))}
      {orgLinksFor(role).map(item)}
    </nav>
  );
}
