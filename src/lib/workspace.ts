/**
 * Workspace vocabulary (ClickUp-style productivity apps).
 * One source of truth for statuses, priorities, views and presence so List, Board,
 * Calendar, Gantt, Docs and Chat never drift apart.
 */
import type { AgereAssignee } from "./agere-tokens";

export type TaskStatus = "backlog" | "todo" | "in-progress" | "review" | "blocked" | "complete";
export type TaskPriority = "urgent" | "high" | "normal" | "low";
export type WorkspaceView = "list" | "board" | "calendar" | "gantt" | "doc" | "chat";
export type Presence = "online" | "away" | "busy" | "offline";
export type Density = "comfortable" | "compact";

export interface WorkspaceMember extends AgereAssignee {
  presence?: Presence;
  email?: string;
}

export const TASK_STATUS_META: Record<TaskStatus, { label: string; order: number; done: boolean }> = {
  backlog: { label: "Backlog", order: 0, done: false },
  todo: { label: "To do", order: 1, done: false },
  "in-progress": { label: "In progress", order: 2, done: false },
  review: { label: "In review", order: 3, done: false },
  blocked: { label: "Blocked", order: 4, done: false },
  complete: { label: "Complete", order: 5, done: true },
};
export const TASK_STATUSES = Object.keys(TASK_STATUS_META) as TaskStatus[];

/** Tailwind classes per status (tokens: task-status.*). */
export const TASK_STATUS_CLASS: Record<TaskStatus, { text: string; bg: string; solid: string; border: string }> = {
  backlog: { text: "text-task-status-backlog-fg", bg: "bg-task-status-backlog-bg", solid: "bg-task-status-backlog", border: "border-task-status-backlog" },
  todo: { text: "text-task-status-todo-fg", bg: "bg-task-status-todo-bg", solid: "bg-task-status-todo", border: "border-task-status-todo" },
  "in-progress": { text: "text-task-status-in-progress-fg", bg: "bg-task-status-in-progress-bg", solid: "bg-task-status-in-progress", border: "border-task-status-in-progress" },
  review: { text: "text-task-status-review-fg", bg: "bg-task-status-review-bg", solid: "bg-task-status-review", border: "border-task-status-review" },
  blocked: { text: "text-task-status-blocked-fg", bg: "bg-task-status-blocked-bg", solid: "bg-task-status-blocked", border: "border-task-status-blocked" },
  complete: { text: "text-task-status-complete-fg", bg: "bg-task-status-complete-bg", solid: "bg-task-status-complete", border: "border-task-status-complete" },
};

export const TASK_PRIORITY_META: Record<TaskPriority, { label: string; rank: number; text: string }> = {
  urgent: { label: "Urgent", rank: 3, text: "text-priority-urgent" },
  high: { label: "High", rank: 2, text: "text-priority-high" },
  normal: { label: "Normal", rank: 1, text: "text-priority-normal" },
  low: { label: "Low", rank: 0, text: "text-priority-low" },
};
export const TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as TaskPriority[];

/** v3 priority names → workspace names ("medium" is "normal" in ClickUp vocabulary). */
export const toTaskPriority = (p?: string): TaskPriority | undefined =>
  p === "medium" ? "normal" : (p as TaskPriority | undefined);

export interface CustomFieldDef {
  id: string;
  label: string;
  kind: "text" | "number" | "currency" | "select";
  options?: { value: string; label: string }[];
  currency?: string;
}

export interface WorkspaceTask {
  id: string;
  /** Human key shown in UI, e.g. "AG-142". */
  key?: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assignees: WorkspaceMember[];
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  dueDate?: string;
  tags?: { id: string; label: string; tone?: "gray" | "info" | "success" | "attention" | "error" | "special" }[];
  subtasks?: { total: number; done: number };
  attachments?: number;
  comments?: number;
  /** Minutes. */
  timeEstimate?: number;
  timeTracked?: number;
  custom?: Record<string, string | number | undefined>;
  list?: string;
}

export const setDensity = (d: Density, el: HTMLElement = document.documentElement) => {
  el.dataset.density = d;
};

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
