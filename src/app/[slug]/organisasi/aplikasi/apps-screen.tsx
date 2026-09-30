"use client";

import * as React from "react";
import { LayoutGrid } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { translator, type Locale } from "@/i18n";
import { PageFrame } from "@/ui/shell/page-frame";
import { useOrgAction } from "@/ui/kelola/use-org-action";
import { everyoneImpactAction, setAppEnabledAction, setEveryoneAction } from "../actions";

type App = { id: string; name: string; enabled: boolean; everyone: boolean; members: number; total: number };

export function AppsScreen({ slug, locale, title, apps }: { slug: string; locale: Locale; title: string; apps: App[] }) {
  const t = translator(locale);
  const { pending, run, dialog: reauth } = useOrgAction(t);
  const [confirm, setConfirm] = React.useState<{ kind: "disable" | "revoke"; app: App; losing?: number } | null>(null);

  return (
    <PageFrame title={title} description={t("apps.lead")} width="read">
      <ul className="divide-y divide-border rounded-xl border border-default">
        {apps.map((app) => (
          <li key={app.id} className="grid gap-4 p-5">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-subtle" aria-hidden>
                <LayoutGrid className="size-5" />
              </span>
              <div className="grid flex-1 gap-0.5">
                <span className="font-medium text-emphasis">{app.name}</span>
                <span className="text-sm text-subtle">{app.id === "space" ? t("apps.space.desc") : ""}</span>
                <span className="text-xs text-subtle">{t("apps.count", String(app.members), String(app.total))}</span>
              </div>
              <Switch
                aria-label={t("apps.enabledLabel", app.name)}
                checked={app.enabled}
                disabled={pending}
                onCheckedChange={(on) => (on ? run(() => setAppEnabledAction(slug, app.id, true)) : setConfirm({ kind: "disable", app }))}
              />
            </div>
            {app.enabled && (
              <label className="flex items-center justify-between gap-4 rounded-lg bg-muted px-4 py-3">
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">{t("apps.everyone")}</span>
                  <span className="text-xs text-subtle">{t("apps.everyoneHint")}</span>
                </span>
                <Switch
                  checked={app.everyone}
                  disabled={pending}
                  onCheckedChange={(on) =>
                    on
                      ? run(() => setEveryoneAction(slug, app.id, true))
                      : everyoneImpactAction(slug, app.id).then((losing) => setConfirm({ kind: "revoke", app, losing }))
                  }
                />
              </label>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirm?.kind === "disable"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? t("apps.disableTitle", confirm.app.name) : ""}
        description={confirm ? t("apps.disableBody", confirm.app.name) : ""}
        confirmLabel={t("apps.disableConfirm")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() => confirm && run(() => setAppEnabledAction(slug, confirm.app.id, false), () => setConfirm(null))}
      />
      <ConfirmDialog
        open={confirm?.kind === "revoke"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? t("apps.revokeTitle", confirm.app.name) : ""}
        description={confirm ? t("apps.revokeBody", String(confirm.losing ?? 0)) : ""}
        confirmLabel={t("apps.revokeConfirm")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() => confirm && run(() => setEveryoneAction(slug, confirm.app.id, false), () => setConfirm(null))}
      />
      {reauth}
    </PageFrame>
  );
}
