"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import { translator, type Locale } from "@/i18n";
import type { Blocker } from "@/modules/account/deletion";
import { ReauthDialog } from "@/ui/kelola/reauth-dialog";
import { deleteAccountAction, leaveOrganizationAction } from "../actions";

export function AccountScreen({ locale, blockers }: { locale: Locale; blockers: Blocker[] }) {
  const t = translator(locale);
  const router = useRouter();
  const [leaving, setLeaving] = React.useState<Blocker | null>(null);
  const [reauth, setReauth] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [pending, start] = React.useTransition();
  const soleOwner = blockers.filter((b) => b.soleOwner);
  const reason = soleOwner.length ? t("settings.transferFirst", soleOwner.map((b) => b.name).join(", ")) : blockers.length ? t("settings.leaveFirst", String(blockers.length)) : null;

  const remove = () =>
    start(async () => {
      const r = await deleteAccountAction();
      if (r && !r.ok) {
        if (r.error === "settings.reauth") return setReauth(true);
        toast.error(t(r.error));
      }
    });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("settings.myData")}</CardTitle>
          <CardDescription>{t("settings.myDataHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/me/export" download>
              <Download aria-hidden />
              {t("settings.downloadData")}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("settings.deleteAccount")}</CardTitle>
          <CardDescription>{t("settings.deleteAccountHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {reason && (
            <Alert variant="attention" id="delete-reason">
              {reason}
            </Alert>
          )}
          {blockers.length > 0 && soleOwner.length === 0 && (
            <ul className="grid divide-y divide-[hsl(var(--border))] rounded-lg border border-default">
              {blockers.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="grid">
                    <span className="text-sm font-medium text-emphasis">{b.name}</span>
                    <span className="text-xs text-subtle">{t(`role.${b.role}` as Parameters<typeof t>[0])}</span>
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setLeaving(b)}>{t("settings.leave")}</Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="destructive-outline" className="justify-self-start" disabled={!!reason} aria-describedby={reason ? "delete-reason" : undefined} onClick={() => setConfirm(true)}>
            <Trash2 aria-hidden />
            {t("settings.deleteAccount")}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!leaving}
        onOpenChange={(o) => !o && setLeaving(null)}
        title={t("settings.leaveConfirm", leaving?.name ?? "")}
        description={t("settings.leaveBody")}
        confirmLabel={t("settings.leave")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() =>
          start(async () => {
            const r = await leaveOrganizationAction(leaving!.id);
            setLeaving(null);
            if (!r.ok) return void toast.error(t(r.error));
            toast.success(t(r.message ?? "settings.saved"));
            router.refresh();
          })
        }
      />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("settings.deleteAccount")}
        description={t("settings.deleteBody")}
        confirmLabel={t("settings.deleteAccount")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() => {
          setConfirm(false);
          remove();
        }}
      />
      <ReauthDialog t={t} open={reauth} onOpenChange={setReauth} onConfirmed={() => (setReauth(false), remove())} />
    </>
  );
}
