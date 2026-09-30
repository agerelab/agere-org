"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Trash2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeaderActions } from "@/components/ui/page-header";
import { translator, type Locale } from "@/i18n";
import { PageFrame } from "@/ui/shell/page-frame";
import { useOrgAction } from "@/ui/kelola/use-org-action";
import { deleteTeamAction, renameTeamAction, setTeamMembersAction, teamImpactAction } from "../../actions";

type Person = { userId: string; name: string; email: string | null };

export function TeamScreen({ slug, locale, team, members, manage }: { slug: string; locale: Locale; team: { id: string; name: string; memberIds: string[] }; members: Person[]; manage: boolean }) {
  const t = translator(locale);
  const router = useRouter();
  const { pending, run, dialog: reauth } = useOrgAction(t);
  const [dialog, setDialog] = React.useState<"members" | "rename" | "delete" | null>(null);
  const [picked, setPicked] = React.useState<string[]>(team.memberIds);
  const [name, setName] = React.useState(team.name);
  const [impact, setImpact] = React.useState<{ members: number; items: number } | null>(null);
  const inTeam = members.filter((m) => team.memberIds.includes(m.userId));

  const openDelete = () => {
    setImpact(null);
    setDialog("delete");
    teamImpactAction(slug, team.id).then(setImpact);
  };

  return (
    <PageFrame
      title={team.name}
      description={t("teams.count", String(inTeam.length))}
      actions={
        manage ? (
          <PageHeaderActions
            primary={{ label: t("team.manageMembers"), icon: <UserPlus />, onSelect: () => (setPicked(team.memberIds), setDialog("members")) }}
            secondary={[{ label: t("team.rename"), icon: <Pencil />, onSelect: () => (setName(team.name), setDialog("rename")) }]}
            menu={[{ label: t("team.delete"), icon: <Trash2 />, destructive: true, onSelect: openDelete }]}
          />
        ) : undefined
      }
    >
      <Link href={`/${slug}/organisasi/tim`} className="-mt-3 inline-flex items-center gap-1 self-start rounded-sm text-sm text-subtle hover:text-emphasis focus-ring">
        <ChevronLeft aria-hidden className="size-4" />
        {t("team.back")}
      </Link>
      {inTeam.length === 0 ? (
        <p className="rounded-lg border border-dashed border-default px-4 py-10 text-center text-sm text-subtle">{t("team.noMembers")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-default">
          {inTeam.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar name={m.name} size="md" />
              <span className="grid min-w-0">
                <span className="truncate font-medium text-emphasis">{m.name}</span>
                {m.email && <span className="truncate text-xs text-subtle">{m.email}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialog === "members"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent closeLabel={t("common.cancel")}>
          <DialogHeader>
            <DialogTitle>{t("team.manageMembers")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <ul className="grid max-h-80 gap-1 overflow-y-auto">
              {members.map((m) => (
                <li key={m.userId}>
                  <label className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-subtle">
                    <Checkbox
                      checked={picked.includes(m.userId)}
                      onCheckedChange={(c) => setPicked((p) => (c ? [...p, m.userId] : p.filter((x) => x !== m.userId)))}
                    />
                    <Avatar name={m.name} size="sm" />
                    <span className="truncate text-sm">{m.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>{t("common.cancel")}</Button>
            <Button disabled={pending} onClick={() => run(() => setTeamMembersAction(slug, team.id, picked), () => setDialog(null))}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "rename"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent size="sm" closeLabel={t("common.cancel")}>
          <form className="grid gap-4" onSubmit={(e) => (e.preventDefault(), run(() => renameTeamAction(slug, team.id, name), () => setDialog(null)))}>
            <DialogHeader>
              <DialogTitle>{t("team.rename")}</DialogTitle>
            </DialogHeader>
            <FormField label={t("teams.name")} required>
              <FormControl>
                <Input autoFocus maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={pending || !name.trim()}>{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("team.deleteTitle", team.name)}
        description={impact ? t("team.deleteBody", String(impact.members), String(impact.items)) : "…"}
        confirmLabel={t("team.delete")}
        cancelLabel={t("common.cancel")}
        loading={pending || !impact}
        onConfirm={() => run(() => deleteTeamAction(slug, team.id), () => router.push(`/${slug}/organisasi/tim`))}
      />
      {reauth}
    </PageFrame>
  );
}
