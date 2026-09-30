"use client";

// "Space baru" and "Edit space" (PRD-06 §6.9, US-13, US-14): name, icon (upload or one of 10 built-in),
// description, and — when creating — who can open it. Later access changes go through Bagikan.
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
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
import { createSpaceAction, updateSpaceAction, uploadIconAction } from "@/app/[slug]/s/actions";
import { assetUrl, SPACE_ICON, SpaceIcon } from "./icons";

type T = ReturnType<typeof translator>;
export type SpaceDraft = { id?: string; name: string; iconKey: string; iconAssetId?: string | null; description: string };

const TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];
const MAX = 1024 * 1024;

export function SpaceDialog({
  t,
  slug,
  orgId,
  open,
  onOpenChange,
  initial,
  onDelete,
}: {
  t: T;
  slug: string;
  orgId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: SpaceDraft;
  /** "Hapus space" in the footer (edit only, manage). */
  onDelete?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initial?.name ?? "");
  const [iconKey, setIconKey] = React.useState(initial?.iconKey ?? "layers");
  const [iconAssetId, setIconAssetId] = React.useState<string | null>(initial?.iconAssetId ?? null);
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [access, setAccess] = React.useState<"org" | "restricted">("org");
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [iconError, setIconError] = React.useState<MessageKey | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [pending, start] = React.useTransition();
  const file = React.useRef<HTMLInputElement>(null);
  const editing = !!initial?.id;

  const pick = async (f: File | undefined) => {
    if (file.current) file.current.value = "";
    if (!f) return;
    setIconError(null);
    // Checked here first so a wrong file is never sent (US-14); the server checks again.
    if (!TYPES.includes(f.type)) return setIconError("icon.badType");
    if (f.size > MAX) return setIconError("icon.tooLarge");
    setUploading(true);
    const form = new FormData();
    form.set("file", f);
    const r = await uploadIconAction(slug, form);
    setUploading(false);
    if (!r.ok) return setIconError(r.error);
    setIconAssetId(r.id);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = editing
        ? await updateSpaceAction(slug, initial!.id!, { name, iconKey, iconAssetId, description })
        : await createSpaceAction(slug, { name, iconKey, iconAssetId, description, access });
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
            <fieldset className="grid gap-3">
              <legend className="mb-2 text-sm font-medium">{t("space.icon")}</legend>
              <div className="flex items-center gap-3">
                <span className="grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-xl border border-default bg-subtle">
                  <SpaceIcon iconKey={iconKey} src={assetUrl(orgId, iconAssetId)} className={iconAssetId ? "size-full" : "size-7"} />
                </span>
                <div className="grid gap-1">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" loading={uploading} onClick={() => file.current?.click()}>
                      <Upload aria-hidden />
                      {t("icon.upload")}
                    </Button>
                    {iconAssetId && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setIconAssetId(null)}>
                        {t("icon.remove")}
                      </Button>
                    )}
                  </div>
                  <p className={cn("text-xs", iconError ? "text-error-on-surface" : "text-subtle")} role={iconError ? "alert" : undefined}>
                    {t(iconError ?? "icon.hint")}
                  </p>
                </div>
                <input
                  ref={file}
                  type="file"
                  accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => pick(e.target.files?.[0])}
                />
              </div>
              <div role="radiogroup" aria-label={t("icon.builtIn")} className="flex flex-wrap gap-2">
                {Object.entries(SPACE_ICON).map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={!iconAssetId && iconKey === key}
                    aria-label={t(`icon.${key}` as MessageKey)}
                    onClick={() => {
                      setIconKey(key);
                      setIconAssetId(null);
                    }}
                    className={cn("grid size-10 place-items-center rounded-lg border border-default hover:bg-subtle focus-ring", !iconAssetId && iconKey === key && "border-emphasis bg-subtle")}
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
          <DialogFooter className="sm:justify-between">
            {editing && onDelete ? (
              <Button type="button" variant="destructive-outline" onClick={onDelete}>{t("space.deleteSpace")}</Button>
            ) : (
              <span aria-hidden />
            )}
            <div className="flex gap-2 max-sm:flex-col-reverse">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={pending || uploading || !name.trim()}>{t(editing ? "common.save" : "space.create")}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
