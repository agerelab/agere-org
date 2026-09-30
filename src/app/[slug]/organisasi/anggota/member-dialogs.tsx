"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormControl, FormField } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MessageKey, translator } from "@/i18n";
import type { Role } from "@/lib/context";
import { canChangeRole } from "@/modules/authz/matrix";
import { changeRoleAction, handoverAction, inviteAction, removeAction, type ActionState } from "../actions";
import type { Member } from "./members-screen";

type T = ReturnType<typeof translator>;
type Run = (fn: () => Promise<ActionState>, onOk?: () => void) => void;

/** Invite up to 20 emails as Member or Admin (PRD-03 §5, onboarding step 3 uses the same rules). */
export function InviteDialog({ t, slug, open, onOpenChange, canInviteAdmin }: { t: T; slug: string; open: boolean; onOpenChange: (o: boolean) => void; canInviteAdmin: boolean }) {
  const [emails, setEmails] = React.useState("");
  const [role, setRole] = React.useState<"member" | "admin">("member");
  const [error, setError] = React.useState<{ key: MessageKey; args?: string[] } | null>(null);
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<ActionState | null>(null);
  const close = (o: boolean) => {
    if (!o) {
      setEmails("");
      setError(null);
      setResult(null);
    }
    onOpenChange(o);
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent closeLabel={t("common.cancel")}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await inviteAction(slug, emails, role);
              if (r.ok) {
                setResult(r);
                setEmails("");
                setError(null);
              } else setError({ key: r.error, args: r.args });
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("people.invite")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            {result?.ok && result.message && <Alert variant="success">{t(result.message, ...(result.args ?? []))}</Alert>}
            <FormField label={t("invite.emails")} hint={t("invite.emailsHint")} error={error ? t(error.key, ...(error.args ?? [])) : undefined} required>
              <FormControl>
                <Textarea autoFocus rows={4} value={emails} onChange={(e) => setEmails(e.target.value)} />
              </FormControl>
            </FormField>
            <FormField label={t("invite.role")}>
              <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="member">{t("role.member")}</SelectItem>
                  {canInviteAdmin && <SelectItem value="admin">{t("role.admin")}</SelectItem>}
                </SelectContent>
              </Select>
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending || !emails.trim()}>{pending ? t("auth.processing") : t("invite.submit")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** G4: every role change is confirmed with its consequence; promotion to Owner re-authenticates. */
export function RoleDialog({ t, slug, orgName, member, actorRole, self, run, pending, onClose }: { t: T; slug: string; orgName: string; member: Member; actorRole: Role; self: boolean; run: Run; pending: boolean; onClose: () => void }) {
  const options = (["owner", "admin", "member"] as const).filter((r) => r === member.role || (self ? actorRole === "owner" && r !== "owner" : canChangeRole(actorRole, member.role, r)));
  const [role, setRole] = React.useState<Role>(member.role);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm" closeLabel={t("common.cancel")}>
        <DialogHeader>
          <DialogTitle>{t("roleDialog.title", member.name)}</DialogTitle>
          <DialogDescription>{t(`roleDialog.${role}`, member.name, orgName)}</DialogDescription>
        </DialogHeader>
        <FormField label={t("invite.role")}>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <FormControl>
              <SelectTrigger><SelectValue /></SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((r) => <SelectItem key={r} value={r}>{t(`role.${r}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={pending || role === member.role} onClick={() => run(() => changeRoleAction(slug, member.userId, role), onClose)}>
            {t("people.action.changeRole")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Remove-member wizard (PRD-03 §8.1): counts per app, a target per app, default the acting admin. */
export function RemoveDialog({ t, slug, member, candidates, me, run, pending, onClose }: { t: T; slug: string; member: Member; candidates: Member[]; me: string; run: Run; pending: boolean; onClose: () => void }) {
  const [work, setWork] = React.useState<{ app: string; count: number }[] | null>(null);
  const [targets, setTargets] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let live = true;
    handoverAction(slug, member.userId).then((w) => live && setWork(w));
    return () => {
      live = false;
    };
  }, [slug, member.userId]);
  const label = (app: string, count: number) => (app === "access" ? t("remove.app.access", String(count)) : t("remove.app.space", String(count)));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={t("common.cancel")}>
        <DialogHeader>
          <DialogTitle>{t("remove.title", member.name)}</DialogTitle>
          <DialogDescription>{t("remove.body", member.name)}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          <p className="text-sm font-medium text-emphasis">{t("remove.handover")}</p>
          {work === null ? (
            <div className="h-10 animate-pulse rounded-md bg-subtle" aria-hidden />
          ) : work.length === 0 ? (
            <p className="text-sm text-subtle">{t("remove.none")}</p>
          ) : (
            work.map((w) => (
              <div key={w.app} className="grid items-center gap-2 sm:grid-cols-[1fr_220px]">
                <span className="text-sm">{label(w.app, w.count)}</span>
                <Select value={targets[w.app] ?? me} onValueChange={(v) => setTargets((x) => ({ ...x, [w.app]: v }))}>
                  <SelectTrigger aria-label={t("remove.targetFor", label(w.app, w.count))}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => (
                      <SelectItem key={c.userId} value={c.userId}>
                        {c.userId === me ? `${t("common.you")} (${c.name})` : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="destructive" disabled={pending || work === null} onClick={() => run(() => removeAction(slug, member.userId, member.name, targets), onClose)}>
            {t("remove.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
