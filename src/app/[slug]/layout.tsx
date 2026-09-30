import { AppShell } from "@/ui/shell/app-shell";
import { getLocale, getPanelHidden, getTheme } from "@/i18n/server";
import { todayIn } from "@/lib/dates";
import { myTasks, spaceTree } from "@/modules/space/queries";
import { orgsWithUnread, unreadCount } from "@/modules/notifications";
import { addDays } from "@/lib/dates";
import { requireOrg } from "./shell";

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await requireOrg(slug);
  const today = todayIn(page.org.timezone);
  const [locale, theme, panelHidden, tree, unread, unreadOrgs, mine] = await Promise.all([
    getLocale(),
    getTheme(),
    getPanelHidden(),
    spaceTree(page.ctx, today),
    unreadCount(page.ctx),
    orgsWithUnread(page.ctx.userId),
    myTasks(page.ctx),
  ]);
  const tomorrow = addDays(today, 1);
  const focus = mine
    .filter((x) => !x.done && (x.dueDate === today || x.dueDate === tomorrow))
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || a.title.localeCompare(b.title))
    .slice(0, 4)
    .map((x) => ({ id: x.id, title: x.title, href: `/${slug}/s/${x.spaceId}/${x.projectId}/papan?task=${x.id}`, dueDate: x.dueDate!, today: x.dueDate === today }));
  const spaces =
    tree === "NO_APP_ACCESS"
      ? null
      : tree.map((s) => ({
          id: s.id,
          name: s.name,
          iconKey: s.iconKey,
          iconAssetId: s.iconAssetId,
          projects: s.projects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name, favorite: p.favorite })),
        }));
  return (
    <AppShell
      org={page.org}
      user={page.user}
      role={page.ctx.role}
      orgs={page.orgs}
      spaces={spaces}
      unread={unread}
      unreadOrgs={unreadOrgs}
      focus={focus}
      locale={locale}
      theme={theme}
      panelHidden={panelHidden}
    >
      {children}
    </AppShell>
  );
}
