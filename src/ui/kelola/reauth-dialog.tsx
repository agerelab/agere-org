"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormControl, FormField } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/input";
import type { translator } from "@/i18n";
import { reauthAction } from "@/app/(auth)/actions";

/** Re-authentication for sensitive actions (PRD-01 §6.3, US-8). */
export function ReauthDialog({ t, open, onOpenChange, onConfirmed }: { t: ReturnType<typeof translator>; open: boolean; onOpenChange: (o: boolean) => void; onConfirmed: () => void }) {
  const [password, setPassword] = React.useState("");
  const [wrong, setWrong] = React.useState(false);
  const [pending, start] = React.useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPassword("");
          setWrong(false);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent size="sm" closeLabel={t("common.cancel")}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              if (await reauthAction(password)) {
                setPassword("");
                setWrong(false);
                onConfirmed();
              } else setWrong(true);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("reauth.title")}</DialogTitle>
            <DialogDescription>{t("reauth.body")}</DialogDescription>
          </DialogHeader>
          {wrong && <Alert variant="error">{t("reauth.wrong")}</Alert>}
          <FormField label={t("auth.password")} required>
            <FormControl>
              <PasswordInput autoFocus value={password} onChange={(e) => setPassword(e.target.value)} showLabel={t("auth.showPassword")} hideLabel={t("auth.hidePassword")} />
            </FormControl>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending || !password}>
              {t("reauth.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
