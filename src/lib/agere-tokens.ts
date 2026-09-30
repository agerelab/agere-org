/**
 * Shared semantic maps used by every Agere module so status/priority
 * colors never drift between Calendar, Kanban, Table and Drawer.
 */
export type AgereStatusTone = "red" | "yellow" | "blue" | "green" | "purple";
export type AgerePriority = "low" | "medium" | "high" | "urgent";

export interface AgerePropertyTag {
  id: string;
  label: string;
  status: AgereStatusTone;
}

export interface AgereAssignee {
  id: string;
  name: string;
  avatarUrl?: string;
  initials?: string;
}

/** Maps a status tone to an AgereBadge variant. */
export const STATUS_BADGE_VARIANT = {
  red: "status-red",
  yellow: "status-amber",
  blue: "status-blue",
  green: "status-green",
  purple: "status-purple",
} as const satisfies Record<AgereStatusTone, string>;

export const STATUS_DOT_CLASS: Record<AgereStatusTone, string> = {
  red: "bg-destructive",
  yellow: "bg-warning",
  blue: "bg-info",
  green: "bg-success",
  purple: "bg-special",
};

export const PRIORITY_META: Record<AgerePriority, { label: string; className: string; rank: number }> = {
  low: { label: "Low", className: "text-muted-foreground", rank: 0 },
  medium: { label: "Medium", className: "text-info", rank: 1 },
  high: { label: "High", className: "text-warning", rank: 2 },
  urgent: { label: "Urgent", className: "text-destructive", rank: 3 },
};
