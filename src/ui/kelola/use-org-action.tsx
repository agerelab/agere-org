"use client";

// Runs a Kelola server action: toasts its outcome (UI-01 "Toast & simpan") and, when the server asks
// for re-authentication (PRD-01 §6.3), confirms the password and retries once.
import * as React from "react";
import { toast } from "@/components/ui/toast";
import type { ActionState } from "@/app/[slug]/organisasi/actions";
import type { translator } from "@/i18n";
import { ReauthDialog } from "./reauth-dialog";

type T = ReturnType<typeof translator>;
type Fn = () => Promise<ActionState>;

export function useOrgAction(t: T) {
  const [pending, start] = React.useTransition();
  const [retry, setRetry] = React.useState<{ fn: Fn; onOk?: () => void } | null>(null);

  const run = React.useCallback(
    (fn: Fn, onOk?: () => void) =>
      start(async () => {
        const r = await fn();
        if (r.ok) {
          if (r.message) toast.success(t(r.message, ...(r.args ?? [])));
          onOk?.();
        } else if (r.reauth) {
          setRetry({ fn, onOk });
        } else {
          toast.error(t(r.error, ...(r.args ?? [])));
        }
      }),
    [t],
  );

  const dialog = (
    <ReauthDialog
      t={t}
      open={!!retry}
      onOpenChange={(o) => !o && setRetry(null)}
      onConfirmed={() => {
        const r = retry;
        setRetry(null);
        if (r) run(r.fn, r.onOk);
      }}
    />
  );
  return { pending, run, dialog };
}
