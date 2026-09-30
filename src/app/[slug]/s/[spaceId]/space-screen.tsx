"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderPlus, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderTitle } from "@/components/ui/page-header";
import { toast } from "@/components/ui/toast";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { atLeast } from "@/modules/authz/levels";
import type { SpaceSummary } from "@/modules/space/queries";
import { initials, SpaceIcon } from "@/ui/space/icons";
import { SpaceDialog } from "@/ui/space/space-dialog";
import { createProjectAction, deleteSpaceAction } from "../actions";

export function SpaceScreen({ slug, locale, space }: { slug: string; locale: Locale; space: SpaceSummary }) {
  const t = translator(locale);
  const router = useRouter();
  const [dialog, setDialog] = React.useState<"project" | "edit" | "delete" | null>(null);
  const [query, setQuery] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [pending, start] = React.useTransition();
  const canEdit = atLeast(space.level, "edit");
  const canManage = atLeast(space.level, "manage");
  const q = query.trim().toLowerCase();
  const projects = space.projects.filter((p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  const access = space.everyone ? t("space.everyone") : t("space.restricted");

  const newProject = { label: t("project.new"), icon: <Plus />, onSelect: () => (setName(""), setError(null), setDialog("project")) };

  return (
    <div className="flex max-w-[1320px] flex-col gap-6 px-4 pb-14 pt-8 md:px-10">
      <PageHeader>
        <PageHeaderContent>
          <p className="flex items-center gap-1.5 text-13 text-subtle">
            <SpaceIcon iconKey={space.iconKey} className="size-3.5" />
            {t("space.overline")}
          </p>
          <PageHeaderTitle>{space.name}</PageHeaderTitle>
          {space.description && <PageHeaderDescription>{space.description}</PageHeaderDescription>}
          <p className="text-sm text-subtle">{access} · {t("space.projects", String(space.projects.length))}</p>
        </PageHeaderContent>
        <PageHeaderActions
          primary={canEdit ? newProject : undefined}
          secondary={canManage ? [{ label: t("space.editSpace"), icon: <Pencil />, onSelect: () => setDialog("edit") }] : undefined}
          menu={canManage ? [{ label: t("space.deleteSpace"), icon: <Trash2 />, destructive: true, onSelect: () => setDialog("delete") }] : undefined}
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
          <div className="w-full sm:w-72">
            <Input type="search" aria-label={t("space.search")} placeholder={t("space.search")} leadingIcon={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/${slug}/s/${space.id}/${p.id}`}
                  className="flex min-h-[196px] flex-col gap-2 rounded-xl border border-default bg-card p-6 shadow-sm transition-shadow hover:border-emphasis hover:shadow-md focus-ring"
                >
                  <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-subtle text-base font-semibold">{initials(p.name)}</span>
                  <span className="text-base font-semibold text-emphasis">{p.name}</span>
                  <span className="line-clamp-2 text-sm text-subtle">{p.description || t("project.noDescription")}</span>
                  <span className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-subtle">
                    {p.total > 0 && <span>{t("project.progress", String(p.done), String(p.total))}</span>}
                    {p.overdue > 0 && <span className="text-error-on-surface">{t("project.overdue", String(p.overdue))}</span>}
                    {p.restricted && <Badge variant="secondary" startIcon={<Lock />}>{t("space.restricted")}</Badge>}
                    {p.archived && <Badge variant="outline">{t("project.archived")}</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
        <SpaceDialog t={t} slug={slug} open onOpenChange={(o) => !o && setDialog(null)} initial={{ id: space.id, name: space.name, iconKey: space.iconKey, description: space.description }} />
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
