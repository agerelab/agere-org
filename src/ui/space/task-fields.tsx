"use client";

// Property editors shared by the task modal and "Tugas baru": status, assignee, due, priority.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { Priority } from "@/db/schema";
import type { translator } from "@/i18n";
import type { BoardColumn } from "./board";
import { StatusIcon } from "./task-bits";

type T = ReturnType<typeof translator>;
export type AssigneeOption = { type: "user" | "team"; id: string; name: string };
const NONE = "__none";

export function StatusSelect({ t, columns, value, onChange, disabled, id }: { t: T; columns: BoardColumn[]; value: string; onChange: (v: string) => void; disabled?: boolean; id?: string }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={t("task.status")}><SelectValue /></SelectTrigger>
      <SelectContent>
        {columns.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="inline-flex items-center gap-2"><StatusIcon category={c.category} />{c.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AssigneeSelect({ t, options, value, onChange, disabled, id }: { t: T; options: AssigneeOption[]; value: AssigneeOption | null; onChange: (v: AssigneeOption | null) => void; disabled?: boolean; id?: string }) {
  const key = value ? `${value.type}:${value.id}` : NONE;
  return (
    <Select value={key} onValueChange={(v) => onChange(v === NONE ? null : options.find((o) => `${o.type}:${o.id}` === v) ?? null)} disabled={disabled}>
      <SelectTrigger id={id} aria-label={t("task.assignee")}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("task.none")}</SelectItem>
        {options.map((o) => (
          <SelectItem key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>{o.name}</SelectItem>
        ))}
        {value && !options.some((o) => o.id === value.id) && <SelectItem value={key}>{value.name}</SelectItem>}
      </SelectContent>
    </Select>
  );
}

export function PrioritySelect({ t, value, onChange, disabled, id }: { t: T; value: Priority | null; onChange: (v: Priority | null) => void; disabled?: boolean; id?: string }) {
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : (v as Priority))} disabled={disabled}>
      <SelectTrigger id={id} aria-label={t("task.priority")}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("priority.none")}</SelectItem>
        {(["urgent", "high", "medium", "low"] as const).map((p) => <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function DueInput({ t, value, onChange, disabled, id }: { t: T; value: string | null; onChange: (v: string | null) => void; disabled?: boolean; id?: string }) {
  return <Input id={id} type="date" aria-label={t("task.due")} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value || null)} />;
}
