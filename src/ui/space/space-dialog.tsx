"use client";

// "Space baru" and "Edit space" (PRD-06 §6.9): name, built-in icon, description, and — when creating —
// who can open it. Uploaded icons need object storage and follow later.
import * as React from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { MessageKey, translator } from "@/i18n";
import { createSpaceAction, updateSpaceAction } from "@/app/[slug]/s/actions";
import { SPACE_ICON } from "./icons";

type T = ReturnType<typeof translator>;
export type SpaceDraft = { id?: string; name: string; iconKey: string; description: string };

export function SpaceDialog({ t, slug, open, onOpenChange, initial }: { t: T; slug: string; open: boolean; onOpenChange: (o: boolean) => void; initial?: SpaceDraft }) {
  const router = useRouter();
  const [name, setName] = React.useState(initial?.name ?? "");
  const [iconKey, setIconKey] = React.useState(initial?.iconKey ?? "layers");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [access, setAccess] = React.useState<"org" | "restricted">("org");
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [pending, start] = React.useTransition();
  const editing = !!initial?.id;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = editing ? await updateSpaceAction(slug, initial!.id!, { name, iconKey, description }) : await createSpaceAction(slug, { name, iconKey, description, access });
      if (!r.ok) return setError(r.error);
      toast.success(t("space.saved"));
      onOpenChange(false);
      if (!editing && "id" in r) router.push(`/${slug}/s/${r.id}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("common.cancel")}>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t(editing ? "space.editSpace" : "space.newSpace")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            {error && error !== "space.taken" && error !== "space.nameInvalid" && <Alert variant="error">{t(error)}</Alert>}
            <FormField label={t("space.name")} error={error === "space.taken" || error === "space.nameInvalid" ? t(error) : undefined} required>
              <FormControl>
                <Input autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
            </FormField>
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">{t("space.icon")}</legend>
              <div role="radiogroup" aria-label={t("space.icon")} className="flex flex-wrap gap-2">
                {Object.entries(SPACE_ICON).map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={iconKey === key}
                    aria-label={key}
                    onClick={() => setIconKey(key)}
                    className={cn("grid size-10 place-items-center rounded-lg border border-default hover:bg-subtle focus-ring", iconKey === key && "border-emphasis bg-subtle")}
                  >
                    <Icon aria-hidden className="size-5" />
                  </button>
                ))}
              </div>
            </fieldset>
            <FormField label={t("space.description")}>
              <FormControl>
                <Textarea rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
              </FormControl>
            </FormField>
            {!editing && (
              <FormField label={t("space.whoCanOpen")} hint={t("space.whoCanOpenHint")}>
                <Select value={access} onValueChange={(v) => setAccess(v as "org" | "restricted")}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="org">{t("space.everyone")}</SelectItem>
                    <SelectItem value="restricted">{t("space.restricted")} · {t("space.onlyYou")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending || !name.trim()}>{t(editing ? "common.save" : "space.create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
