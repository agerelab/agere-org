"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Monitor, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { FormControl, FormField } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { formatDateShort, formatTime } from "@/i18n/format";
import type { Device, SecurityEvent } from "@/modules/account/security";
import { changePasswordAction, revokeDeviceAction, signOutEverywhereAction } from "../actions";

/** A short, readable device name from the user agent ("Chrome · Windows"). */
function deviceName(ua: string | null, fallback: string) {
  if (!ua) return fallback;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : null;
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : null;
  return [browser, os].filter(Boolean).join(" · ") || fallback;
}

const EVENT_LABEL: Record<string, MessageKey> = {
  "security.password.changed": "settings.event.passwordChanged",
  "security.session.revoked": "settings.event.sessionRevoked",
  "security.login.failed_threshold": "settings.event.locked",
  "security.account.linked": "settings.event.linked",
  "security.account.unlinked": "settings.event.unlinked",
  "security.mfa.changed": "settings.event.mfa",
};

export function SecurityScreen({ locale, devices, activity }: { locale: Locale; devices: Device[]; activity: SecurityEvent[] }) {
  const t = translator(locale);
  const router = useRouter();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [error, setError] = React.useState<{ field?: string; key: MessageKey } | null>(null);
  const [confirmAll, setConfirmAll] = React.useState(false);
  const [pending, start] = React.useTransition();
  const when = (iso: string) => `${formatDateShort(locale, new Date(iso))} ${formatTime(locale, new Date(iso))}`;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("settings.changePassword")}</CardTitle>
          <CardDescription>{t("settings.changePasswordHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid max-w-md gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                setError(null);
                const r = await changePasswordAction(current, next);
                if (!r.ok) return setError({ field: r.field, key: r.error });
                setCurrent("");
                setNext("");
                toast.success(t(r.message ?? "settings.saved"));
                router.refresh();
              });
            }}
          >
            <FormField label={t("settings.currentPassword")} error={error?.field === "current" ? t(error.key) : undefined} required>
              <FormControl>
                <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" showLabel={t("auth.showPassword")} hideLabel={t("auth.hidePassword")} />
              </FormControl>
            </FormField>
            <FormField label={t("settings.newPassword")} hint={t("auth.passwordHint")} error={error?.field === "next" ? t(error.key) : undefined} required>
              <FormControl>
                <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" showLabel={t("auth.showPassword")} hideLabel={t("auth.hidePassword")} />
              </FormControl>
            </FormField>
            <Button type="submit" className="justify-self-start" loading={pending} disabled={!current || !next}>{t("settings.changePassword")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("settings.devices")}</CardTitle>
          <CardDescription>{t("settings.devicesHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ul className="grid divide-y divide-[hsl(var(--border))] rounded-lg border border-default">
            {devices.map((d) => {
              const mobile = /Android|iPhone|iPad|Mobile/.test(d.userAgent ?? "");
              return (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  {mobile ? <Smartphone aria-hidden className="size-5 text-subtle" /> : <Monitor aria-hidden className="size-5 text-subtle" />}
                  <span className="grid min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-emphasis">
                      {deviceName(d.userAgent, t("settings.unknownDevice"))}
                      {d.current && <Badge variant="success">{t("settings.thisDevice")}</Badge>}
                    </span>
                    <span className="text-xs text-subtle">{t("settings.lastActive", when(d.lastSeenAt))}</span>
                  </span>
                  {!d.current && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await revokeDeviceAction(d.id);
                          if (!r.ok) return void toast.error(t(r.error));
                          toast.success(t(r.message ?? "settings.saved"));
                          router.refresh();
                        })
                      }
                    >
                      {t("settings.signOutDevice")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <Button variant="destructive-outline" className="justify-self-start" onClick={() => setConfirmAll(true)}>
            <LogOut aria-hidden />
            {t("settings.signOutAll")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("settings.activity")}</CardTitle>
          <CardDescription>{t("settings.activityHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-subtle">{t("settings.activityEmpty")}</p>
          ) : (
            <ul className="grid gap-2">
              {activity.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-x-4 text-sm">
                  <span className="text-default">{t(EVENT_LABEL[e.type] ?? "settings.event.other")}</span>
                  <span className="text-subtle tabular-nums">{when(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={t("settings.signOutAllConfirm")}
        description={t("settings.signOutAllBody")}
        confirmLabel={t("settings.signOutAll")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() => start(() => signOutEverywhereAction())}
      />
    </>
  );
}
