"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeaderActions } from "@/components/ui/page-header";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { PageFrame } from "@/ui/shell/page-frame";
import { createTeamAction } from "../actions";

export function TeamsScreen({ slug, locale, title, teams, manage }: { slug: string; locale: Locale; title: string; teams: { id: string; name: string; members: number }[]; manage: boolean }) {
  const t = translator(locale);
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [pending, start] = React.useTransition();
  const create = { label: t("teams.new"), icon: <Plus />, onSelect: () => setOpen(true) };
  return (
    <PageFrame title={title} description={t("teams.lead")} actions={manage && teams.length > 0 ? <PageHeaderActions primary={create} /> : undefined}>
      {teams.length === 0 ? (
        <EmptyState
          icon={<UsersRound />}
          title={t("teams.empty.title")}
          description={t("teams.empty.body")}
          actions={manage ? <Button onClick={() => setOpen(true)}><Plus aria-hidden />{t("teams.new")}</Button> : undefined}
        />
      ) : (
        <ul className="grid gap-2">
          {teams.map((team) => (
            <li key={team.id}>
              <Link href={`/${slug}/organisasi/tim/${team.id}`} className="flex items-center gap-3 rounded-lg border border-default px-4 py-3 hover:bg-subtle focus-ring">
                <span className="grid size-9 place-items-center rounded-md bg-subtle text-sm font-semibold" aria-hidden>{team.name.slice(0, 2).toUpperCase()}</span>
                <span className="grid flex-1 gap-0.5">
                  <span className="font-medium text-emphasis">{team.name}</span>
                  <span className="text-xs text-subtle">{t("teams.count", String(team.members))}</span>
                </span>
                <ChevronRight aria-hidden className="size-4 text-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open} onOpenChange={(o) => (setOpen(o), !o && (setName(""), setError(null)))}>
        <DialogContent size="sm" closeLabel={t("common.cancel")}>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await createTeamAction(slug, name);
                if (r.ok && r.id) router.push(`/${slug}/organisasi/tim/${r.id}`);
                else if (!r.ok) setError(r.error);
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("teams.new")}</DialogTitle>
            </DialogHeader>
            <FormField label={t("teams.name")} error={error ? t(error) : undefined} required>
              <FormControl>
                <Input autoFocus maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={pending || !name.trim()}>{t("teams.create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
}
