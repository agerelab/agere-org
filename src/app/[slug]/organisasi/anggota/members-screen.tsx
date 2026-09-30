"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Search, UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeaderActions } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { translator, type Locale } from "@/i18n";
import { formatDateShort } from "@/i18n/format";
import type { Role } from "@/lib/context";
import { canActOn, canChangeRole, isAdminRole } from "@/modules/authz/matrix";
import { PageFrame } from "@/ui/shell/page-frame";
import { useOrgAction } from "@/ui/kelola/use-org-action";
import { leaveAction, reactivateAction, resendAction, revokeAction, suspendAction } from "../actions";
import { InviteDialog, RemoveDialog, RoleDialog } from "./member-dialogs";

export type Member = { userId: string; name: string; email: string | null; role: Role; status: "active" | "suspended"; joinedAt: string; lastActiveAt: string | null; teams: { id: string; name: string }[]; title: string | null; avatar: string | null };
export type Invitation = { id: string; email: string; role: "member" | "admin"; expiresAt: string; expired: boolean; invitedBy: string };
type Props = {
  slug: string;
  locale: Locale;
  title: string;
  lead: string;
  orgName: string;
  me: { userId: string; role: Role };
  members: Member[];
  invitations: Invitation[];
  teams: { id: string; name: string; members: number }[];
};

type Dialogs = { kind: "invite" } | { kind: "role" | "remove" | "suspend"; member: Member } | { kind: "revoke"; invitation: Invitation } | { kind: "leave" } | null;

export function MembersScreen({ slug, locale, title, lead, orgName, me, members, invitations, teams }: Props) {
  const t = translator(locale);
  const router = useRouter();
  const { pending, run, dialog: reauth } = useOrgAction(t);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | Role>("all");
  const [teamFilter, setTeamFilter] = React.useState("all");
  const [dialog, setDialog] = React.useState<Dialogs>(null);
  const manage = isAdminRole(me.role);
  const q = query.trim().toLowerCase();

  const match = (m: Member) =>
    (!q || m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q)) &&
    (roleFilter === "all" || m.role === roleFilter) &&
    (teamFilter === "all" || m.teams.some((x) => x.id === teamFilter));
  const active = members.filter((m) => m.status === "active");
  const suspended = members.filter((m) => m.status === "suspended");
  const shownInvites = invitations.filter((i) => !q || i.email.includes(q));
  const onlyMe = active.length === 1 && !invitations.length;

  const roleBadge = (role: Role) => (
    <Badge variant={role === "member" ? "outline" : "secondary"}>{t(`role.${role}`)}</Badge>
  );

  const memberMenu = (m: Member) => {
    const self = m.userId === me.userId;
    const items: React.ReactNode[] = [];
    if (!self && (canChangeRole(me.role, m.role, "admin") || canChangeRole(me.role, m.role, "member") || canChangeRole(me.role, m.role, "owner")))
      items.push(<DropdownMenuItem key="role" onSelect={() => setDialog({ kind: "role", member: m })}>{t("people.action.changeRole")}</DropdownMenuItem>);
    if (self && me.role === "owner") items.push(<DropdownMenuItem key="role" onSelect={() => setDialog({ kind: "role", member: m })}>{t("people.action.changeRole")}</DropdownMenuItem>);
    if (!self && canActOn(me.role, m.role)) {
      items.push(
        m.status === "active" ? (
          <DropdownMenuItem key="suspend" onSelect={() => setDialog({ kind: "suspend", member: m })}>{t("people.action.suspend")}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem key="react" onSelect={() => run(() => reactivateAction(slug, m.userId, m.name))}>{t("people.action.reactivate")}</DropdownMenuItem>
        ),
      );
      items.push(<DropdownMenuSeparator key="sep" />, <DropdownMenuItem key="remove" destructive onSelect={() => setDialog({ kind: "remove", member: m })}>{t("people.action.remove")}</DropdownMenuItem>);
    }
    if (self) items.push(<DropdownMenuItem key="leave" destructive onSelect={() => setDialog({ kind: "leave" })}>{t("people.action.leave")}</DropdownMenuItem>);
    if (!items.length) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton size="sm" label={t("people.actions", m.name)} icon={<MoreHorizontal />} tooltip={false} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{items}</DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const memberTable = (rows: Member[], empty: string) =>
    rows.filter(match).length === 0 ? (
      <p className="rounded-lg border border-dashed border-default px-4 py-10 text-center text-sm text-subtle">{q || roleFilter !== "all" || teamFilter !== "all" ? t("people.noResults") : empty}</p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("people.col.name")}</TableHead>
            <TableHead>{t("people.col.role")}</TableHead>
            <TableHead className="max-md:hidden">{t("people.col.teams")}</TableHead>
            <TableHead className="max-md:hidden">{t("people.col.lastActive")}</TableHead>
            <TableHead className="w-12"><span className="sr-only">{t("people.col.name")}</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.filter(match).map((m) => (
            <TableRow key={m.userId}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.name} src={m.avatar ?? undefined} size="md" />
                  <div className="grid min-w-0">
                    <span className="truncate font-medium text-emphasis">
                      {m.name}
                      {m.userId === me.userId && <span className="font-normal text-subtle"> · {t("common.you")}</span>}
                    </span>
                    {(m.title || m.email) && <span className="truncate text-xs text-subtle">{[m.title, m.email].filter(Boolean).join(" · ")}</span>}
                  </div>
                </div>
              </TableCell>
              <TableCell>{roleBadge(m.role)}</TableCell>
              <TableCell className="max-md:hidden">
                <span className="text-sm text-subtle">{m.teams.map((x) => x.name).join(", ") || "—"}</span>
              </TableCell>
              <TableCell className="text-sm text-subtle max-md:hidden">{m.lastActiveAt ? formatDateShort(locale, new Date(m.lastActiveAt)) : t("common.never")}</TableCell>
              <TableCell className="text-right">{memberMenu(m)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

  return (
    <PageFrame
      title={title}
      description={lead}
      actions={manage ? <PageHeaderActions primary={{ label: t("people.invite"), icon: <UserPlus />, onSelect: () => setDialog({ kind: "invite" }) }} /> : undefined}
    >
      {manage && onlyMe ? (
        <EmptyState icon={<Users />} title={t("people.empty.title")} description={t("people.empty.body")} />
      ) : (
        <Tabs defaultValue="active" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="active">{t("people.tab.active")} <span className="ml-1 text-subtle">{active.length}</span></TabsTrigger>
              {manage && <TabsTrigger value="invited">{t("people.tab.invited")} <span className="ml-1 text-subtle">{invitations.length}</span></TabsTrigger>}
              {manage && <TabsTrigger value="suspended">{t("people.tab.suspended")} <span className="ml-1 text-subtle">{suspended.length}</span></TabsTrigger>}
            </TabsList>
            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
              <div className="w-full sm:w-56">
                <Input type="search" aria-label={t("people.search")} placeholder={t("people.search")} leadingIcon={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
                <SelectTrigger aria-label={t("people.col.role")} className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("people.allRoles")}</SelectItem>
                  {(["owner", "admin", "member"] as const).map((r) => <SelectItem key={r} value={r}>{t(`role.${r}`)}</SelectItem>)}
                </SelectContent>
              </Select>
              {teams.length > 0 && (
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger aria-label={t("people.col.teams")} className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("people.allTeams")}</SelectItem>
                    {teams.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <TabsContent value="active">{memberTable(active, t("people.noResults"))}</TabsContent>
          {manage && (
            <TabsContent value="invited">
              {shownInvites.length === 0 ? (
                <p className="rounded-lg border border-dashed border-default px-4 py-10 text-center text-sm text-subtle">{t("people.emptyInvited")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("people.col.email")}</TableHead>
                      <TableHead>{t("people.col.role")}</TableHead>
                      <TableHead className="max-md:hidden">{t("people.col.expires")}</TableHead>
                      <TableHead className="max-md:hidden">{t("people.col.invitedBy")}</TableHead>
                      <TableHead className="w-12"><span className="sr-only">{t("people.col.email")}</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shownInvites.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium text-emphasis">{i.email}</TableCell>
                        <TableCell>{roleBadge(i.role)}</TableCell>
                        <TableCell className="max-md:hidden">
                          {i.expired ? <Badge variant="attention">{t("people.status.expired")}</Badge> : <span className="text-sm text-subtle">{formatDateShort(locale, new Date(i.expiresAt))}</span>}
                        </TableCell>
                        <TableCell className="text-sm text-subtle max-md:hidden">{i.invitedBy}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton size="sm" label={t("people.actions", i.email)} icon={<MoreHorizontal />} tooltip={false} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => run(() => resendAction(slug, i.id))}>{t("people.action.resend")}</DropdownMenuItem>
                              <DropdownMenuItem destructive onSelect={() => setDialog({ kind: "revoke", invitation: i })}>{t("people.action.revoke")}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          )}
          {manage && <TabsContent value="suspended">{memberTable(suspended, t("people.emptySuspended"))}</TabsContent>}
        </Tabs>
      )}

      <InviteDialog t={t} slug={slug} open={dialog?.kind === "invite"} onOpenChange={(o) => !o && setDialog(null)} canInviteAdmin={isAdminRole(me.role)} />
      {dialog?.kind === "role" && (
        <RoleDialog t={t} slug={slug} orgName={orgName} member={dialog.member} actorRole={me.role} self={dialog.member.userId === me.userId} run={run} pending={pending} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "remove" && (
        <RemoveDialog t={t} slug={slug} member={dialog.member} candidates={active.filter((m) => m.userId !== dialog.member.userId)} me={me.userId} run={run} pending={pending} onClose={() => setDialog(null)} />
      )}
      <ConfirmDialog
        open={dialog?.kind === "suspend"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === "suspend" ? t("suspend.title", dialog.member.name) : ""}
        description={dialog?.kind === "suspend" ? t("suspend.body", dialog.member.name) : ""}
        confirmLabel={t("people.action.suspend")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() => dialog?.kind === "suspend" && run(() => suspendAction(slug, dialog.member.userId, dialog.member.name), () => setDialog(null))}
      />
      <ConfirmDialog
        open={dialog?.kind === "revoke"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === "revoke" ? t("revoke.title", dialog.invitation.email) : ""}
        description={t("revoke.body")}
        confirmLabel={t("people.action.revoke")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() => dialog?.kind === "revoke" && run(() => revokeAction(slug, dialog.invitation.id), () => setDialog(null))}
      />
      <ConfirmDialog
        open={dialog?.kind === "leave"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("leave.title", orgName)}
        description={t("leave.body", orgName)}
        confirmLabel={t("people.action.leave")}
        cancelLabel={t("common.cancel")}
        loading={pending}
        onConfirm={() => run(() => leaveAction(slug), () => router.push("/"))}
      />
      {reauth}
    </PageFrame>
  );
}
