"use client";

// Project status (PRD-06 §6.8, US-11): a manual judgment next to the facts. The chip reads
// "Berisiko · target 30 Okt 2026"; for manage it opens "Status proyek".
import * as React from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { Locale, MessageKey, translator } from "@/i18n";
import { formatIsoDate } from "@/i18n/format";
import type { ProjectStatus } from "@/modules/space/projects";
import { setStatusAction } from "@/app/[slug]/s/actions";

type T = ReturnType<typeof translator>;
export const STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = { on_track: "success", at_risk: "attention", off_track: "error" };

export function statusLabel(t: T, locale: Locale, status: ProjectStatus | null, targetDate: string | null) {
  const target = targetDate ? t("status.target", formatIsoDate(locale, targetDate)) : null;
  if (!status) return target ?? t("status.none");
  return target ? `${t(`status.${status}` as MessageKey)} · ${target}` : t(`status.${status}` as MessageKey);
}

export function StatusChip({ t, locale, status, targetDate, onClick }: { t: T; locale: Locale; status: ProjectStatus | null; targetDate: string | null; onClick?: () => void }) {
  const label = statusLabel(t, locale, status, targetDate);
  const badge = (
    <Badge variant={status ? STATUS_VARIANT[status] : "outline"} dot={!!status}>
      {label}
    </Badge>
  );
  if (!onClick) return badge;
  return (
    <button type="button" onClick={onClick} aria-label={t("status.edit", label)} className="rounded-md focus-ring">
      {badge}
    </button>
  );
}

export type StatusDraft = { status: ProjectStatus | null; targetDate: string | null; note: string; ownerUserId: string | null };

export function StatusDialog({ t, slug, projectId, initial, people, onClose }: { t: T; slug: string; projectId: string; initial: StatusDraft; people: { id: string; name: string }[]; onClose: () => void }) {
  const [status, setStatus] = React.useState<string>(initial.status ?? "none");
  const [targetDate, setTargetDate] = React.useState(initial.targetDate ?? "");
  const [note, setNote] = React.useState(initial.note);
  const [owner, setOwner] = React.useState(initial.ownerUserId ?? "none");
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [pending, start] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await setStatusAction(slug, projectId, {
        status: status === "none" ? null : (status as ProjectStatus),
        targetDate: targetDate || null,
        note,
        ownerUserId: owner === "none" ? null : owner,
      });
      if (!r.ok) return setError(r.error);
      toast.success(t("status.saved"));
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={t("common.cancel")}>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t("status.title")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <FormField label={t("status.label")}>
              <Select value={status} onValueChange={setStatus}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">{t("status.none")}</SelectItem>
                  <SelectItem value="on_track">{t("status.on_track")}</SelectItem>
                  <SelectItem value="at_risk">{t("status.at_risk")}</SelectItem>
                  <SelectItem value="off_track">{t("status.off_track")}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("status.targetDate")}>
              <FormControl>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </FormControl>
            </FormField>
            <FormField label={t("status.owner")} hint={t("status.ownerHint")} error={error === "status.ownerNoAccess" ? t(error) : undefined}>
              <Select value={owner} onValueChange={setOwner}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">{t("task.none")}</SelectItem>
                  {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("status.note")} hint={t("status.noteCount", String(note.length))} error={error && error !== "status.ownerNoAccess" ? t(error) : undefined}>
              <FormControl>
                <Textarea rows={3} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
              </FormControl>
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" loading={pending}>{t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
