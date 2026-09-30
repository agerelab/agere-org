"use client";

// Bagikan (PRD-04 v1.5 §8.1–8.4): simple by default — private link, the organization switch
// (Semua anggota ↔ Terbatas) with the people who have access — and "Akses lanjutan" for per-person and
// per-team levels. Read-only below manage. Changes are audited (access.acl.changed).
import * as React from "react";
import { ChevronDown, Info, Link2, SlidersHorizontal, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { AclLevel } from "@/db/schema";
import type { MessageKey, translator } from "@/i18n";
import type { ShareInfo, ShareTarget } from "@/modules/space/sharing";
import { saveSharingAction, shareInfoAction } from "@/app/[slug]/s/actions";
import { initials } from "./icons";

type T = ReturnType<typeof translator>;
type Entry = ShareInfo["entries"][number];
const LEVELS: AclLevel[] = ["manage", "edit", "view"];
const ORDER: Record<AclLevel, number> = { manage: 0, edit: 1, view: 2 };

export function ShareDialog({ t, slug, orgName, target, subtitle, onClose }: { t: T; slug: string; orgName: string; target: ShareTarget; subtitle: string; onClose: () => void }) {
  const [info, setInfo] = React.useState<ShareInfo | null>(null);
  const [loadError, setLoadError] = React.useState<MessageKey | null>(null);
  const [mode, setMode] = React.useState<"simple" | "advanced">("simple");
  const [expanded, setExpanded] = React.useState(false);
  const [pending, start] = React.useTransition();

  const load = React.useCallback(async () => {
    const r = await shareInfoAction(slug, target);
    if (r.ok) setInfo(r.info);
    else setLoadError(r.error);
  }, [slug, target]);

  React.useEffect(() => {
    let live = true;
    shareInfoAction(slug, target).then((r) => {
      if (!live) return;
      if (r.ok) setInfo(r.info);
      else setLoadError(r.error);
    });
    return () => {
      live = false;
    };
  }, [slug, target]);

  const copy = async () => {
    const url = window.location.origin + window.location.pathname;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share.copied"));
    } catch {
      toast.error(t("share.copyFailed"));
    }
  };

  const toggleEveryone = (on: boolean) =>
    start(async () => {
      if (!info) return;
      const r = await saveSharingAction(slug, target, { everyone: on, followSpace: target.kind === "project" ? on || (info.followsSpace && !info.spaceEveryone) : undefined, entries: info.entries.map((e) => ({ principal: e.principal, level: e.level })) });
      if (!r.ok) return void toast.error(t(r.error));
      toast.success(t("share.saved"));
      await load();
    });

  const project = target.kind === "project";
  const switchDisabled = !info?.canManage || (project && !info.spaceEveryone);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-[520px]">
        {mode === "advanced" && info ? (
          <Advanced t={t} slug={slug} target={target} info={info} onBack={() => setMode("simple")} onSaved={async () => { await load(); setMode("simple"); }} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t(project ? "share.titleView" : "share.titleSpace")}</DialogTitle>
              <DialogDescription>{subtitle}</DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-5">
              {loadError && <Alert variant="error">{t(loadError)}</Alert>}
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle"><Link2 className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-emphasis">{t("share.privateLink")}</p>
                  <p className="text-xs text-subtle">{t("share.privateLinkHint")}</p>
                </div>
                <Button size="sm" variant="outline" onClick={copy}>{t("share.copyLink")}</Button>
              </div>
              <div className="grid gap-2 border-t border-default pt-4">
                <p className="text-sm font-medium text-emphasis">{t("share.with")}</p>
                {!info ? (
                  <div className="grid gap-2" aria-busy>
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <div className="rounded-lg border border-default">
                    <div className="flex items-center gap-3 p-3">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setExpanded((x) => !x)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-ring"
                      >
                        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-emphasis text-xs font-semibold text-emphasis">{initials(orgName)}</span>
                        <span className="grid min-w-0 gap-0.5">
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-emphasis">
                            {orgName}
                            <Badge variant="secondary">{t("share.orgMembers")}</Badge>
                          </span>
                          <span className="text-xs text-subtle">{t("share.peopleCount", String(info.people.length))}</span>
                        </span>
                        <AvatarGroup aria-hidden people={info.people.map((p) => ({ id: p.id, name: p.name }))} max={3} size="xs" className="ml-auto max-sm:hidden" />
                        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-subtle transition-transform", expanded && "rotate-180")} />
                      </button>
                      <Switch
                        checked={info.everyone}
                        disabled={switchDisabled || pending}
                        onCheckedChange={toggleEveryone}
                        aria-label={t("share.everyoneSwitch", orgName)}
                      />
                    </div>
                    {project && !info.spaceEveryone && (
                      <p className="flex items-start gap-2 border-t border-default px-3 py-2 text-xs text-subtle">
                        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                        {t("share.projectNarrower")}
                      </p>
                    )}
                    {expanded && (
                      <ul className="grid max-h-64 gap-1 overflow-y-auto border-t border-default p-2" aria-label={t("share.peopleWithAccess")}>
                        {info.people.map((p) => (
                          <li key={p.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                            <Avatar name={p.name} size="sm" aria-hidden />
                            <span className="grid min-w-0 flex-1">
                              <span className="truncate text-sm text-emphasis">{p.name}</span>
                              <span className="truncate text-xs text-subtle">{p.email}</span>
                            </span>
                            <span className="text-xs text-subtle">{p.admin ? t("share.viaAdmin") : t(`share.can.${p.level}` as MessageKey)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              {info && !info.canManage && <p className="text-xs text-subtle">{t("share.readOnly")}</p>}
            </DialogBody>
            <DialogFooter className="items-center sm:justify-between">
              <Button variant="ghost" disabled={!info} onClick={() => setMode("advanced")}>
                <SlidersHorizontal aria-hidden />
                {t("share.advanced")}
              </Button>
              <span className="text-xs text-subtle">{t("share.audited")}</span>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** "Akses lanjutan": preset, add a person or team, per-row level, "Simpan akses" (§8.1, §8.2). */
function Advanced({ t, slug, target, info, onBack, onSaved }: { t: T; slug: string; target: ShareTarget; info: ShareInfo; onBack: () => void; onSaved: () => Promise<void> }) {
  const project = target.kind === "project";
  // Space: everyone | restricted. Project: follow (the space's access) | restricted.
  const [preset, setPreset] = React.useState<"everyone" | "follow" | "restricted">(project ? (info.followsSpace ? "follow" : "restricted") : info.everyone ? "everyone" : "restricted");
  const [entries, setEntries] = React.useState<Entry[]>(info.entries);
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [pending, start] = React.useTransition();
  const readOnly = !info.canManage;
  const sorted = [...entries].sort((a, b) => ORDER[a.level] - ORDER[b.level] || a.name.localeCompare(b.name));
  const taken = new Set(entries.map((e) => `${e.principal.type}:${e.principal.id}`));
  const options = [
    ...info.options.users.filter((u) => !taken.has(`user:${u.id}`)).map((u) => ({ value: `user:${u.id}`, label: u.name, keywords: [u.email], group: t("share.people") })),
    ...info.options.teams.filter((x) => !taken.has(`team:${x.id}`)).map((x) => ({ value: `team:${x.id}`, label: x.name, group: t("share.teams") })),
  ];

  const add = (value: string) => {
    const [type, id] = value.split(":") as ["user" | "team", string];
    const u = info.options.users.find((x) => x.id === id);
    const tm = info.options.teams.find((x) => x.id === id);
    if (!u && !tm) return;
    setEntries((es) => [...es, { principal: { type, id }, level: "edit", name: u?.name ?? tm!.name, detail: u?.email ?? String(tm!.members) }]);
  };

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveSharingAction(slug, target, {
        everyone: project ? preset === "follow" && info.spaceEveryone : preset === "everyone",
        followSpace: project ? preset === "follow" : undefined,
        entries: entries.map((e) => ({ principal: e.principal, level: e.level })),
      });
      if (!r.ok) return setError(r.error);
      toast.success(t("share.saved"));
      await onSaved();
    });

  const spaceAccess = info.spaceEveryone ? t("space.everyone") : t("space.restricted");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("share.advancedTitle", info.name)}</DialogTitle>
        <DialogDescription>{t(project ? "share.advancedHintProject" : "share.advancedHintSpace")}</DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-4">
        {error && <Alert variant="error">{t(error)}</Alert>}
        {readOnly && <Alert variant="info">{t("share.readOnly")}</Alert>}
        <div className="grid gap-1.5">
          <label htmlFor="share-preset" className="text-sm font-medium">{t("share.whoCanAccess")}</label>
          <Select value={preset} onValueChange={(v) => setPreset(v as typeof preset)} disabled={readOnly}>
            <SelectTrigger id="share-preset"><SelectValue /></SelectTrigger>
            <SelectContent>
              {project ? (
                <>
                  <SelectItem value="follow">{t("share.followSpace", spaceAccess)}</SelectItem>
                  <SelectItem value="restricted">{t("space.restricted")}</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="everyone">{t("space.everyone")}</SelectItem>
                  <SelectItem value="restricted">{t("space.restricted")}</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        {!readOnly && (
          <Combobox
            aria-label={t("share.add")}
            options={options}
            value=""
            onValueChange={(v) => v && add(v)}
            placeholder={t("share.add")}
            searchPlaceholder={t("share.search")}
            emptyText={t("share.noMatch")}
          />
        )}
        {sorted.length === 0 ? (
          <p className="text-sm text-subtle">{t("share.onlyYou")}</p>
        ) : (
          <ul className="grid gap-1" aria-label={t("share.principals")}>
            {sorted.map((e) => (
              <li key={`${e.principal.type}:${e.principal.id}`} className="flex items-center gap-3 rounded-md py-1">
                <Avatar name={e.name} size="sm" aria-hidden />
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm text-emphasis">{e.name}</span>
                  <span className="truncate text-xs text-subtle">{e.principal.type === "team" ? t("share.teamMembers", e.detail) : e.detail}</span>
                </span>
                <div className="w-36 shrink-0">
                  <Select
                    value={e.level}
                    disabled={readOnly}
                    onValueChange={(v) => setEntries((es) => es.map((x) => (x === e ? { ...x, level: v as AclLevel } : x)))}
                  >
                    <SelectTrigger className="h-8" aria-label={t("share.levelFor", e.name)}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => <SelectItem key={l} value={l}>{t(`share.level.${l}` as MessageKey)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {!readOnly && <IconButton size="xs" variant="ghost" label={t("share.removeFrom", e.name)} icon={<X />} onClick={() => setEntries((es) => es.filter((x) => x !== e))} />}
              </li>
            ))}
          </ul>
        )}
        <p className="flex items-start gap-2 text-xs text-subtle">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {t(project ? "share.inheritNoteProject" : "share.inheritNoteSpace")}
        </p>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onBack}>{t(readOnly ? "common.back" : "common.cancel")}</Button>
        {!readOnly && <Button onClick={save} loading={pending}>{t("share.save")}</Button>}
      </DialogFooter>
    </>
  );
}
