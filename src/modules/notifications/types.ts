// Notification kinds (PRD-10 §5). Plain data shared by the consumer (server) and Kotak masuk (client):
// each kind has a sentence and a type label in both languages; `vars` fill the sentence.

export const KINDS = [
  "task_assigned",
  "task_assigned_team",
  "comment_mention",
  "work_reassigned",
  "member_joined",
  "role_changed",
  "app_granted",
  "app_revoked",
  "project_status",
  "due_today",
] as const;
export type Kind = (typeof KINDS)[number];

/** "Untuk saya" (§6): assignments, mentions and work handed to me. */
export const FOR_ME: Kind[] = ["task_assigned", "task_assigned_team", "comment_mention", "work_reassigned"];

/** Placeholders of each sentence, in order ({0}, {1}, …); bold in the UI. */
export const SENTENCE_VARS: Record<Kind, string[]> = {
  task_assigned: ["actor", "task", "project"],
  task_assigned_team: ["actor", "task", "team"],
  comment_mention: ["actor", "task"],
  work_reassigned: ["count", "from"],
  member_joined: ["name", "org"],
  role_changed: ["org", "role"],
  app_granted: ["app"],
  app_revoked: ["app"],
  project_status: ["actor", "project", "status"],
  due_today: ["count"],
};

export type InboxTab = "all" | "unread" | "forMe";
export type InboxItem = {
  id: string;
  kind: Kind;
  vars: Record<string, string | number>;
  actorName: string | null;
  createdAt: string;
  read: boolean;
  forMe: boolean;
};
