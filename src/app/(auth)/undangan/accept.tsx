"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { translator, type Locale, type MessageKey } from "@/i18n";
import { acceptInvitationAction, acceptInvitationByIdAction } from "../org-actions";

export function AcceptInvitation({ locale, token, organizationId, id, variant = "default" }: { locale: Locale; token?: string; organizationId?: string; id?: string; variant?: "default" | "outline" }) {
  const t = translator(locale);
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <div className="grid gap-3">
      {error && <Alert variant="error">{t(error)}</Alert>}
      <Button
        variant={variant}
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = token ? await acceptInvitationAction(token) : await acceptInvitationByIdAction(organizationId!, id!);
            if (r?.error) setError(r.error);
          })
        }
      >
        {pending ? t("auth.processing") : t("invitation.accept")}
      </Button>
    </div>
  );
}
