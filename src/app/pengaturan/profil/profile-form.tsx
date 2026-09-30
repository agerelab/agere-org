"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { removeAvatarAction, updateProfileAction, uploadAvatarAction } from "../actions";

const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Crops the picture to a centred square of 256 px (PRD-12 §4) before it is sent. */
async function crop256(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/webp", 0.9));
}

export function ProfileForm({ locale, user }: { locale: Locale; user: { id: string; name: string; email: string; title: string; avatar: string | null } }) {
  const t = translator(locale);
  const router = useRouter();
  const [name, setName] = React.useState(user.name);
  const [title, setTitle] = React.useState(user.title);
  const [error, setError] = React.useState<{ field?: string; key: MessageKey } | null>(null);
  const [avatarError, setAvatarError] = React.useState<MessageKey | null>(null);
  const [pending, start] = React.useTransition();
  const [uploading, setUploading] = React.useState(false);
  const file = React.useRef<HTMLInputElement>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError(null);
      const r = await updateProfileAction({ name, title });
      if (!r.ok) return setError({ field: r.field, key: r.error });
      toast.success(t(r.message ?? "settings.saved"));
      router.refresh();
    });
  };

  const pick = async (f: File | undefined) => {
    if (file.current) file.current.value = "";
    if (!f) return;
    setAvatarError(null);
    if (!TYPES.includes(f.type) || f.size > 2 * 1024 * 1024) return setAvatarError("settings.avatarInvalid");
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", new File([await crop256(f)], "avatar.webp", { type: "image/webp" }));
      const r = await uploadAvatarAction(form);
      if (!r.ok) return setAvatarError(r.error);
      toast.success(t("settings.saved"));
      router.refresh();
    } catch {
      setAvatarError("settings.avatarInvalid");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("settings.photo")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar name={user.name} src={user.avatar ?? undefined} size="xl" />
          <div className="grid gap-1.5">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" loading={uploading} onClick={() => file.current?.click()}>
                <Upload aria-hidden />
                {t("settings.uploadPhoto")}
              </Button>
              {user.avatar && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    start(async () => {
                      await removeAvatarAction();
                      router.refresh();
                    })
                  }
                >
                  {t("icon.remove")}
                </Button>
              )}
            </div>
            <p className={avatarError ? "text-xs text-error-on-surface" : "text-xs text-subtle"} role={avatarError ? "alert" : undefined}>
              {t(avatarError ?? "settings.photoHint")}
            </p>
          </div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files?.[0])} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle as="h2">{t("settings.nav.profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid max-w-md gap-4" noValidate>
            <FormField label={t("auth.name")} error={error?.field === "name" ? t(error.key) : undefined} required>
              <FormControl>
                <Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </FormControl>
            </FormField>
            <FormField label={t("settings.jobTitle")} hint={t("settings.jobTitleHint")} error={error?.field === "title" ? t(error.key) : undefined}>
              <FormControl>
                <Input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} autoComplete="organization-title" />
              </FormControl>
            </FormField>
            <FormField label={t("auth.email")} hint={t("settings.emailHint")}>
              <FormControl>
                <Input value={user.email} readOnly disabled />
              </FormControl>
            </FormField>
            <Button type="submit" className="justify-self-start" loading={pending}>{pending ? t("settings.saving") : t("common.save")}</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
