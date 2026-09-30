"use client";

// Members tab (PRD-06 v2.2, D50): the people who can open the project — the same source as the header
// avatars — with numbers from this project only. Sortable by any column; no score and no ranking.
import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Locale, MessageKey, translator } from "@/i18n";
import { formatDateShort } from "@/i18n/format";
import type { MemberRow } from "@/modules/space/queries";

type T = ReturnType<typeof translator>;
type Key = "name" | "open" | "overdue" | "done30" | "onTime" | "lastActiveAt";
const COLUMNS: { key: Key; label: MessageKey; numeric?: boolean }[] = [
  { key: "name", label: "members.col.name" },
  { key: "open", label: "members.col.open", numeric: true },
  { key: "overdue", label: "members.col.overdue", numeric: true },
  { key: "done30", label: "members.col.done30", numeric: true },
  { key: "onTime", label: "members.col.onTime", numeric: true },
  { key: "lastActiveAt", label: "members.col.lastActive" },
];

export function ProjectMembers({ t, locale, data }: { t: T; locale: Locale; data: { rows: MemberRow[]; open: number; unassigned: number; overdue: number } }) {
  const [sort, setSort] = React.useState<{ key: Key; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const rows = [...data.rows].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    const cmp = av === bv ? a.name.localeCompare(b.name) : av === null ? 1 : bv === null ? -1 : typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sort.dir === "asc" ? cmp : -cmp;
  });
  const toggle = (key: Key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  const value = (r: MemberRow, k: Key) => {
    if (k === "onTime") return r.onTime === null ? "—" : `${r.onTime}%`;
    if (k === "lastActiveAt") return r.lastActiveAt ? formatDateShort(locale, new Date(r.lastActiveAt)) : t("common.never");
    return String(r[k]);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-base font-semibold text-emphasis">{t("members.title", String(data.rows.length))}</h2>
        <p className="text-sm text-subtle">{t("members.lead")}</p>
        <p className="text-sm text-default">
          {t("members.summary", String(data.open), String(data.unassigned), String(data.overdue))}
        </p>
      </div>
      <Table>
        <TableHeader className="max-lg:sr-only">
          <TableRow>
            {COLUMNS.map((c) => (
              <TableHead key={c.key} aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={c.numeric ? "text-right" : undefined}>
                <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 rounded-sm focus-ring">
                  {t(c.label)}
                  {sort.key === c.key && (sort.dir === "asc" ? <ArrowUp aria-hidden className="size-3" /> : <ArrowDown aria-hidden className="size-3" />)}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:py-2">
              <TableCell className="max-lg:col-span-2">
                <span className="flex items-center gap-3">
                  <Avatar name={r.name} size="md" aria-hidden />
                  <span className="grid min-w-0">
                    <span className="flex items-center gap-2 truncate font-medium text-emphasis">
                      {r.name}
                      {r.lead && <Badge variant="secondary">{t("members.lead.badge")}</Badge>}
                    </span>
                    <span className="truncate text-xs text-subtle">{r.email}</span>
                  </span>
                </span>
              </TableCell>
              {COLUMNS.slice(1).map((c) => (
                <TableCell key={c.key} className={c.numeric ? "tabular-nums lg:text-right" : undefined}>
                  <span className="text-xs text-subtle lg:hidden">{t(c.label)}: </span>
                  <span className={c.key === "overdue" && r.overdue ? "text-error-on-surface" : undefined}>{value(r, c.key)}</span>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
