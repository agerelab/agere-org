"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderPlus, Lock, Pencil, Plus, Search, Share2, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderTitle } from "@/components/ui/page-header";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { atLeast } from "@/modules/authz/levels";
import type { ProjectSummary, SpaceSummary } from "@/modules/space/queries";
import { assetUrl, initials, SpaceIcon } from "@/ui/space/icons";
import { STATUS_VARIANT } from "@/ui/space/project-status";
import { ShareDialog } from "@/ui/space/share-dialog";
import { SpaceDialog } from "@/ui/space/space-dialog";
import { createProjectAction, deleteSpaceAction, setFavoriteAction } from "../actions";

// Status tabs (§6.6): archived projects only appear under "Selesai" (§6.1: hidden from default lists).
const TABS = ["all", "favorite", "on_track", "at_risk", "done"] as const;
type Tab = (typeof TABS)[number];
const inTab = (p: ProjectSummary, tab: Tab) =>
  tab === "done" ? p.archived : !p.archived && (tab === "all" || (tab === "favorite" && p.favorite) || (tab === "on_track" && p.status === "on_track") || (tab === "at_risk" && (p.status === "at_risk" || p.status === "off_track")));

export function SpaceScreen({ slug, orgId, orgName, locale, space }: { slug: string; orgId: string; orgName: string; locale: Locale; space: SpaceSummary }) {
  const t = translator(locale);
  const router = useRouter();
  const [dialog, setDialog] = React.useState<"project" | "edit" | "delete" | "share" | null>(null);
  const [tab, setTab] = React.useState<Tab>("all");
  const [favorites, setFavorites] = React.useOptimistic(
    new Set(space.projects.filter((p) => p.favorite).map((p) => p.id)),
    (set: Set<string>, { id, on }: { id: string; on: boolean }) => {
      const next = new Set(set);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    },
  );
  const [query, setQuery] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [pending, start] = React.useTransition();
  const canEdit = atLeast(space.level, "edit");
  const canManage = atLeast(space.level, "manage");
  const q = query.trim().toLowerCase();
  const all = space.projects.map((p) => ({ ...p, favorite: favorites.has(p.id) }));
  const projects = all.filter((p) => inTab(p, tab) && (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));
  const star = (p: ProjectSummary) =>
    start(async () => {
      setFavorites({ id: p.id, on: !p.favorite });
      const r = await setFavoriteAction(slug, p.id, !p.favorite);
      if (!r.ok) toast.error(t(r.error));
    });
  const access = space.everyone ? t("space.everyone") : t("space.restricted");

  const newProject = { label: t("project.new"), icon: <Plus />, onSelect: () => (setName(""), setError(null), setDialog("project")) };

  return (
    <div className="flex max-w-[1320px] flex-col gap-6 px-4 pb-14 pt-8 md:px-10">
      <PageHeader>
        <PageHeaderContent>
          <p className="flex items-center gap-1.5 text-13 text-subtle">
            <SpaceIcon iconKey={space.iconKey} src={assetUrl(orgId, space.iconAssetId)} className="size-3.5" />
            {t("space.overline")}
          </p>
          <PageHeaderTitle>{space.name}</PageHeaderTitle>
          {space.description && <PageHeaderDescription>{space.description}</PageHeaderDescription>}
          <p className="text-sm text-subtle">{access} · {t("space.projects", String(space.projects.filter((p) => !p.archived).length))}</p>
        </PageHeaderContent>
        <PageHeaderActions
          primary={canEdit ? newProject : undefined}
          secondary={[{ label: t("share.button"), icon: <Share2 />, onSelect: () => setDialog("share") }]}
          menuLabel={t("people.actions", space.name)}
          menu={
            canManage
              ? [
                  { label: t("space.editSpace"), icon: <Pencil />, onSelect: () => setDialog("edit") },
                  "separator",
                  { label: t("space.deleteSpace"), icon: <Trash2 />, destructive: true, onSelect: () => setDialog("delete") },
                ]
              : undefined
          }
        />
      </PageHeader>

      {space.projects.length === 0 ? (
        <EmptyState
          icon={<FolderPlus />}
          headingLevel="h2"
          title={t("project.emptyTitle")}
          description={t("project.emptyBody")}
          actions={canEdit ? <Button onClick={newProject.onSelect}><Plus aria-hidden />{t("project.create")}</Button> : undefined}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label={t("space.statusTabs")} className="flex items-center gap-5 overflow-x-auto border-b border-default">
              {TABS.map((x) => {
                const n = all.filter((p) => inTab(p, x)).length;
                return (
                  <button
                    key={x}
                    type="button"
                    role="tab"
                    aria-selected={tab === x}
                    onClick={() => setTab(x)}
                    className={cn("inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 text-sm font-medium focus-ring", tab === x ? "border-foreground text-emphasis" : "border-transparent text-subtle hover:text-emphasis")}
                  >
                    {t(`space.tab.${x}` as MessageKey)}
                    <span className="rounded-full bg-subtle px-1.5 text-xs tabular-nums text-subtle">{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="w-full sm:w-72">
              <Input type="search" aria-label={t("space.search")} placeholder={t("space.search")} leadingIcon={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          {projects.length === 0 ? (
            <p className="py-10 text-center text-sm text-subtle">{t("space.tabEmpty")}</p>
          ) : (
            <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
              {projects.map((p) => (
                <li key={p.id} className="group/card relative">
                  <Link
                    href={`/${slug}/s/${space.id}/${p.id}`}
                    className="flex h-full min-h-[176px] flex-col gap-2 rounded-xl border border-default bg-card p-6 shadow-sm transition-shadow hover:border-emphasis hover:shadow-md focus-ring"
                  >
                    <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-subtle text-base font-semibold">{initials(p.name)}</span>
                    <span className="pr-8 text-base font-semibold text-emphasis">{p.name}</span>
                    <span className="line-clamp-2 text-sm text-subtle">{p.description || t("project.noDescription")}</span>
                    {/* v2.1.2 (D46): exception chips only — a healthy, open project shows none. */}
                    <span className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                      {(p.status === "at_risk" || p.status === "off_track") && <Badge variant={STATUS_VARIANT[p.status]} dot>{t(`status.${p.status}`)}</Badge>}
                      {p.archived && <Badge variant="success">{t("space.tab.done")}</Badge>}
                      {p.restricted && <Badge variant="secondary" startIcon={<Lock />}>{t("space.restricted")}</Badge>}
                    </span>
                  </Link>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label={t(p.favorite ? "favorite.remove" : "favorite.add", p.name)}
                    aria-pressed={p.favorite}
                    icon={<Star className={cn(p.favorite && "fill-current text-attention-on-surface")} />}
                    onClick={() => star(p)}
                    className={cn("absolute right-4 top-4 opacity-0 focus-visible:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100", p.favorite && "opacity-100")}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={dialog === "project"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent size="sm" closeLabel={t("common.cancel")}>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await createProjectAction(slug, space.id, name);
                if (!r.ok) return setError(r.error);
                router.push(`/${slug}/s/${space.id}/${r.id}/papan`);
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("project.new")}</DialogTitle>
            </DialogHeader>
            <FormField label={t("project.name")} error={error ? t(error) : undefined} required>
              <FormControl>
                <Input autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={pending || !name.trim()}>{t("project.create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dialog === "edit" && (
        <SpaceDialog
          t={t}
          slug={slug}
          orgId={orgId}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          initial={{ id: space.id, name: space.name, iconKey: space.iconKey, iconAssetId: space.iconAssetId, description: space.description }}
          onDelete={() => setDialog("delete")}
        />
      )}
      {dialog === "share" && (
        <ShareDialog t={t} slug={slug} orgName={orgName} target={{ kind: "space", id: space.id }} subtitle={t("share.subtitleSpace", space.name)} onClose={() => setDialog(null)} />
      )}

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("space.deleteConfirm", space.name)}
        description={t("space.deleteBody")}
        confirmLabel={t("space.deleteSpace")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() =>
          start(async () => {
            const r = await deleteSpaceAction(slug, space.id);
            setDialog(null);
            if (!r.ok) return void toast.error(t(r.error, ...(r.args ?? [])));
            toast.success(t("space.deleted"));
            router.push(`/${slug}/s`);
          })
        }
      />
    </div>
  );
}
