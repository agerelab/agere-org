import { AppShell } from "@/ui/shell/app-shell";
import { getLocale, getPanelHidden, getTheme } from "@/i18n/server";
import { todayIn } from "@/lib/dates";
import { spaceTree } from "@/modules/space/queries";
import { requireOrg } from "./shell";

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await requireOrg(slug);
  const [locale, theme, panelHidden, tree] = await Promise.all([getLocale(), getTheme(), getPanelHidden(), spaceTree(page.ctx, todayIn(page.org.timezone))]);
  const spaces = tree === "NO_APP_ACCESS" ? null : tree.map((s) => ({ id: s.id, name: s.name, iconKey: s.iconKey, projects: s.projects.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name })) }));
  return (
    <AppShell org={page.org} user={page.user} role={page.ctx.role} orgs={page.orgs} spaces={spaces} locale={locale} theme={theme} panelHidden={panelHidden}>
      {children}
    </AppShell>
  );
}
