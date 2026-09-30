"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, CircleDot, Flag, Plus, SendHorizontal, Trash2, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatShortDate, isOverdue } from "@/lib/date";
import { PRIORITY_META, STATUS_DOT_CLASS, type AgereAssignee, type AgerePriority, type AgereStatusTone } from "@/lib/agere-tokens";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

/* ================================================================== */
/* Rich text slot                                                      */
/* ================================================================== */

export interface TaskDrawerRichTextProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
  /** Pass a real editor (e.g. Tiptap <EditorContent />) to replace the textarea. */
  children?: React.ReactNode;
}

/**
 * Description field. Ships a plain auto-growing textarea so the DS has no
 * editor dependency; pass your editor as children for rich text.
 */
export const TaskDrawerRichText = React.forwardRef<HTMLTextAreaElement, TaskDrawerRichTextProps>(
  ({ value, onValueChange, children, className, ...props }, ref) => {
    if (children) return <div className={cn("text-sm leading-6", className)}>{children}</div>;
    return (
      <Textarea
        ref={ref}
        autoResize
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder="Add a description"
        aria-label="Description"
        className={cn("min-h-[72px] border-transparent bg-transparent px-2 text-sm leading-6 hover:border-input", className)}
        {...props}
      />
    );
  }
);
TaskDrawerRichText.displayName = "TaskDrawerRichText";

/* ================================================================== */
/* Checklist                                                           */
/* ================================================================== */

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface TaskDrawerChecklistProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onToggle"> {
  items: ChecklistItem[];
  onToggle?: (id: string, done: boolean) => void;
  onAdd?: (label: string) => void;
  onRemove?: (id: string) => void;
}

export const TaskDrawerChecklist = React.forwardRef<HTMLDivElement, TaskDrawerChecklistProps>(
  ({ items, onToggle, onAdd, onRemove, className, ...props }, ref) => {
    const [draft, setDraft] = React.useState("");
    const done = items.filter((i) => i.done).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;

    return (
      <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <Progress value={pct} tone={pct === 100 ? "success" : "default"} aria-label={`Checklist ${done} of ${items.length} done`} />
            <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">{done}/{items.length}</span>
          </div>
        )}
        <ul className="flex flex-col">
          {items.map((item) => {
            const id = `check-${item.id}`;
            return (
              <li key={item.id} className="group/check flex min-h-8 items-center gap-2 rounded-md px-1 hover:bg-foreground/[0.03]">
                <Checkbox id={id} checked={item.done} onCheckedChange={(v) => onToggle?.(item.id, !!v)} />
                <label htmlFor={id} className={cn("flex-1 text-sm", item.done && "text-muted-foreground line-through")}>
                  {item.label}
                </label>
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.label}`}
                    className="opacity-0 focus-visible:opacity-100 group-hover/check:opacity-100"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {onAdd && (
          <form
            className="flex items-center gap-2 px-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              onAdd(draft.trim());
              setDraft("");
            }}
          >
            <Plus className="size-4 text-muted-foreground" aria-hidden />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add an item"
              aria-label="New checklist item"
              className="h-8 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none"
            />
          </form>
        )}
      </div>
    );
  }
);
TaskDrawerChecklist.displayName = "TaskDrawerChecklist";

/* ================================================================== */
/* Comments                                                            */
/* ================================================================== */

export interface TaskComment {
  id: string;
  author: AgereAssignee;
  body: string;
  /** ISO timestamp */
  createdAt: string;
}

export interface TaskDrawerCommentsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  comments: TaskComment[];
  currentUser?: AgereAssignee;
  onSubmit?: (body: string) => void;
  locale?: string;
}

export const TaskDrawerComments = React.forwardRef<HTMLDivElement, TaskDrawerCommentsProps>(
  ({ comments, currentUser, onSubmit, locale = "en-US", className, ...props }, ref) => {
    const [draft, setDraft] = React.useState("");
    const hintId = React.useId();
    const fmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const submit = () => {
      if (!draft.trim()) return;
      onSubmit?.(draft.trim());
      setDraft("");
    };

    return (
      <div ref={ref} className={cn("flex flex-col gap-4", className)} {...props}>
        {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet. Start the thread below.</p>}
        <ol className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar size="sm" name={c.author.name} src={c.author.avatarUrl} initials={c.author.initials} />
              <div className="min-w-0 flex-1">
                <p className="text-xs">
                  <span className="font-semibold text-foreground">{c.author.name}</span>{" "}
                  <time dateTime={c.createdAt} className="text-muted-foreground">{fmt.format(new Date(c.createdAt))}</time>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
        {onSubmit && (
          <div className="flex gap-3">
            {currentUser && <Avatar size="sm" name={currentUser.name} src={currentUser.avatarUrl} initials={currentUser.initials} />}
            <div className="relative flex-1">
              <Textarea
                autoResize
                maxRows={8}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
                }}
                placeholder="Write a comment"
                aria-label="Write a comment"
                aria-describedby={hintId}
                className="min-h-[64px] pr-10 text-sm"
              />
              <Button size="icon-sm" className="absolute bottom-2 right-2" onClick={submit} disabled={!draft.trim()} aria-label="Post comment">
                <SendHorizontal aria-hidden />
              </Button>
              <p id={hintId} className="mt-1 text-2xs text-muted-foreground">Ctrl or ⌘ + Enter to post</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);
TaskDrawerComments.displayName = "TaskDrawerComments";

/* ================================================================== */
/* Properties (right column)                                           */
/* ================================================================== */

export const TaskDrawerProperties = React.forwardRef<HTMLDListElement, React.HTMLAttributes<HTMLDListElement>>(
  ({ className, ...props }, ref) => <dl ref={ref} className={cn("flex flex-col gap-1", className)} {...props} />
);
TaskDrawerProperties.displayName = "TaskDrawerProperties";

export interface TaskDrawerPropertyProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  icon?: React.ReactNode;
}

export const TaskDrawerProperty = React.forwardRef<HTMLDivElement, TaskDrawerPropertyProps>(
  ({ label, icon, className, children, ...props }, ref) => (
    <div ref={ref} className={cn("grid min-h-9 grid-cols-[88px_minmax(0,1fr)] items-center gap-2", className)} {...props}>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">{icon}{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
);
TaskDrawerProperty.displayName = "TaskDrawerProperty";

const pickerTrigger = cn(
  "flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-xs text-foreground",
  "hover:bg-foreground/[0.05] focus-ring data-[state=open]:bg-foreground/[0.05]"
);

/* ---- Status ------------------------------------------------------- */

export interface StatusOption {
  value: string;
  label: string;
  tone: AgereStatusTone;
}

export interface StatusPickerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  value: string;
  options: StatusOption[];
  onValueChange: (value: string) => void;
}

export const StatusPicker = React.forwardRef<HTMLButtonElement, StatusPickerProps>(
  ({ value, options, onValueChange, className, ...props }, ref) => {
    const current = options.find((o) => o.value === value);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger ref={ref} className={cn(pickerTrigger, className)} aria-label={`Status: ${current?.label ?? "None"}`} {...props}>
          <span aria-hidden className={cn("size-2 rounded-full", current ? STATUS_DOT_CLASS[current.tone] : "bg-muted-foreground")} />
          <span className="flex-1 truncate">{current?.label ?? "None"}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((o) => (
              <DropdownMenuRadioItem key={o.value} value={o.value}>
                <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT_CLASS[o.tone])} />
                {o.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);
StatusPicker.displayName = "StatusPicker";

/* ---- Priority ----------------------------------------------------- */

export interface PriorityPickerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  value?: AgerePriority;
  onValueChange: (value: AgerePriority) => void;
}

export const PriorityPicker = React.forwardRef<HTMLButtonElement, PriorityPickerProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const meta = value ? PRIORITY_META[value] : null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger ref={ref} className={cn(pickerTrigger, className)} aria-label={`Priority: ${meta?.label ?? "None"}`} {...props}>
          <Flag className={cn("size-3.5", meta?.className ?? "text-muted-foreground")} aria-hidden />
          <span className="flex-1 truncate">{meta?.label ?? "None"}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={value} onValueChange={(v) => onValueChange(v as AgerePriority)}>
            {(Object.keys(PRIORITY_META) as AgerePriority[]).map((p) => (
              <DropdownMenuRadioItem key={p} value={p}>
                <Flag className={PRIORITY_META[p].className} aria-hidden />
                {PRIORITY_META[p].label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);
PriorityPicker.displayName = "PriorityPicker";

/* ---- Assignee ----------------------------------------------------- */

export interface AssigneePickerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  value?: string;
  people: AgereAssignee[];
  onValueChange: (id: string) => void;
}

export const AssigneePicker = React.forwardRef<HTMLButtonElement, AssigneePickerProps>(
  ({ value, people, onValueChange, className, ...props }, ref) => {
    const current = people.find((p) => p.id === value);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger ref={ref} className={cn(pickerTrigger, className)} aria-label={`Assignee: ${current?.name ?? "Unassigned"}`} {...props}>
          {current ? <Avatar name={current.name} src={current.avatarUrl} initials={current.initials} /> : <UserRound className="size-3.5 text-muted-foreground" aria-hidden />}
          <span className={cn("flex-1 truncate", !current && "text-muted-foreground")}>{current?.name ?? "Unassigned"}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {people.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id}>
                <Avatar name={p.name} src={p.avatarUrl} initials={p.initials} />
                {p.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);
AssigneePicker.displayName = "AssigneePicker";

/* ---- Due date ----------------------------------------------------- */

export interface DueDatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value?: string;
  onValueChange: (value: string | undefined) => void;
}

/** Native date input (accessible, locale-aware) styled as a property row. */
export const DueDatePicker = React.forwardRef<HTMLInputElement, DueDatePickerProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const overdue = isOverdue(value);
    return (
      <label className={cn(pickerTrigger, "relative cursor-pointer", overdue && "text-destructive", className)}>
        <CalendarDays className={cn("size-3.5", overdue ? "text-destructive" : "text-muted-foreground")} aria-hidden />
        <span className={cn("flex-1 truncate", !value && "text-muted-foreground")}>
          {value ? formatShortDate(value) : "No date"}
          {overdue && <span className="ml-1 text-2xs">Overdue</span>}
        </span>
        <input
          ref={ref}
          type="date"
          value={value ?? ""}
          onChange={(e) => onValueChange(e.target.value || undefined)}
          aria-label="Due date"
          className="absolute inset-0 cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          {...props}
        />
      </label>
    );
  }
);
DueDatePicker.displayName = "DueDatePicker";

export { CircleDot as StatusIcon, Flag as PriorityIcon, UserRound as AssigneeIcon, CalendarDays as DueDateIcon };
