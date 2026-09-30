"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { Priority } from "@/db/schema";
import type { MessageKey, translator } from "@/i18n";
import { createTaskAction } from "@/app/[slug]/s/actions";
import type { BoardColumn } from "./board";
import { AssigneeSelect, DueInput, PrioritySelect, StatusSelect, type AssigneeOption } from "./task-fields";

type T = ReturnType<typeof translator>;

/** "Tugas baru" (PRD-06 §6.7 primary action). */
export function NewTaskDialog({ t, slug, projectId, boardId, columns, assignees, columnId, onClose }: { t: T; slug: string; projectId: string; boardId: string; columns: BoardColumn[]; assignees: AssigneeOption[]; columnId?: string; onClose: () => void }) {
  const [title, setTitle] = React.useState("");
  const [column, setColumn] = React.useState(columnId ?? columns.find((c) => c.category === "todo")?.id ?? columns[0]?.id ?? "");
  const [assignee, setAssignee] = React.useState<AssigneeOption | null>(null);
  const [dueDate, setDueDate] = React.useState<string | null>(null);
  const [priority, setPriority] = React.useState<Priority | null>(null);
  const [error, setError] = React.useState<MessageKey | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={t("common.cancel")}>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createTaskAction(slug, projectId, { title, boardId, columnId: column, assignee: assignee ? { type: assignee.type, id: assignee.id } : null, dueDate, priority });
              if (!r.ok) return setError(r.error);
              toast.success(t("task.created.toast"));
              onClose();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("task.new")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            {error && <Alert variant="error">{t(error)}</Alert>}
            <FormField label={t("task.title")} required>
              <FormControl>
                <Input autoFocus maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
              </FormControl>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("task.status")}>
                <StatusSelect t={t} columns={columns} value={column} onChange={setColumn} />
              </FormField>
              <FormField label={t("task.assignee")}>
                <AssigneeSelect t={t} options={assignees} value={assignee} onChange={setAssignee} />
              </FormField>
              <FormField label={t("task.due")}>
                <DueInput t={t} value={dueDate} onChange={setDueDate} />
              </FormField>
              <FormField label={t("task.priority")}>
                <PrioritySelect t={t} value={priority} onChange={setPriority} />
              </FormField>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending || !title.trim()}>{t("task.new")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
