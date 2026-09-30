import type { AgereAssignee, AgerePriority, AgerePropertyTag, AgereStatusTone } from "@/lib/agere-tokens";
import type { TaskPriority, TaskStatus, WorkspaceMember } from "@/lib/workspace";

export interface KanbanCardData {
  id: string;
  title: string;
  description?: string;
  tags?: AgerePropertyTag[];
  priority?: AgerePriority;
  /** YYYY-MM-DD */
  dueDate?: string;
  assignee?: AgereAssignee;
  attachmentCount?: number;
  checklistCount?: number;
  checklistCompleted?: number;
  coverImageUrl?: string;
  metadata?: Record<string, string>;
  /* ---- v4.1 ClickUp-style fields (all optional, backwards compatible) ---- */
  /** Human key, e.g. "AG-142". */
  taskKey?: string;
  /** Parent list / breadcrumb shown above the title. */
  list?: string;
  status?: TaskStatus;
  /** Workspace priority (urgent/high/normal/low). Takes precedence over `priority`. */
  taskPriority?: TaskPriority;
  /** Multiple assignees with presence. Takes precedence over `assignee`. */
  assignees?: WorkspaceMember[];
  subtasks?: { total: number; done: number };
  commentCount?: number;
  /** 0–100. Falls back to subtasks or checklist completion. */
  progress?: number;
}

export interface KanbanColumnData {
  id: string;
  title: string;
  status?: AgereStatusTone;
  cards: KanbanCardData[];
  collapsed?: boolean;
  /** Soft WIP limit — the count turns amber when exceeded. */
  limit?: number;
}

/** Emitted once per completed drop. Indices refer to the unfiltered lists. */
export interface KanbanMove {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  fromIndex: number;
  toIndex: number;
}
