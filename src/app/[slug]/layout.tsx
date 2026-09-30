import { AppShell } from "@/ui/shell/app-shell";
import { getLocale, getPanelHidden, getTheme } from "@/i18n/server";
import { requireOrg } from "./shell";

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [page, locale, theme, panelHidden] = await Promise.all([requireOrg(slug), getLocale(), getTheme(), getPanelHidden()]);
  return (
    <AppShell org={page.org} user={page.user} role={page.ctx.role} orgs={page.orgs} locale={locale} theme={theme} panelHidden={panelHidden}>
      {children}
    </AppShell>
  );
}
