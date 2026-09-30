import { AppShell } from "@/ui/shell/app-shell";
import { getLocale, getPanelHidden, getTheme } from "@/i18n/server";
import { requireShell } from "./shell";

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [shell, locale, theme, panelHidden] = await Promise.all([requireShell(slug), getLocale(), getTheme(), getPanelHidden()]);
  return (
    <AppShell {...shell} locale={locale} theme={theme} panelHidden={panelHidden}>
      {children}
    </AppShell>
  );
}
