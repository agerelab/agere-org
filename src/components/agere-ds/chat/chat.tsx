"use client";

import * as React from "react";
import { AtSign, Bold, Code, Hash, Italic, List, MessageSquareReply, Paperclip, SendHorizontal, SmilePlus, Type, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { TASK_STATUS_META, type TaskStatus, type WorkspaceMember } from "@/lib/workspace";
import { MemberAvatar, StatusIndicator } from "../workspace/task-fields";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */
export interface LinkedTask { id: string; key: string; title: string; status: TaskStatus }
export interface ChatMessage {
  id: string;
  author: WorkspaceMember;
  body: string;
  /** ISO string. */
  sentAt: string;
  edited?: boolean;
  replies?: { count: number; lastAt?: string; participants?: WorkspaceMember[] };
  linkedTask?: LinkedTask;
  reactions?: { emoji: string; count: number; mine?: boolean; label?: string }[];
  attachments?: { id: string; name: string; size?: string }[];
  status?: "sending" | "sent" | "failed";
}

const fmtTime = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

/** Highlights @mentions and #TASK-keys inside plain text. */
function RichBody({ text, own }: { text: string; own?: boolean }) {
  const parts = text.split(/(@[A-Z][\w]*(?: [A-Z][\w]*)?|#[A-Z]+-\d+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^@/.test(p) ? (
          <span key={i} className={cn("rounded-sm px-0.5 font-medium", own ? "bg-brand-fg/15" : "bg-info-bg text-info-fg")}>{p}</span>
        ) : /^#[A-Z]+-\d+$/.test(p) ? (
          <span key={i} className={cn("rounded-sm px-0.5 font-mono text-[0.92em] font-medium", own ? "bg-brand-fg/15" : "bg-emphasis text-emphasis")}>{p}</span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
}

/* ================================================================== */
/* MessageBubble                                                       */
/* ================================================================== */
export interface MessageBubbleProps {
  message: ChatMessage;
  /** Current user's message → right-aligned, brand surface. */
  own?: boolean;
  /** Continuation of the previous author's message: hides avatar + name. */
  continued?: boolean;
  onOpenThread?: (id: string) => void;
  onReact?: (id: string, emoji: string) => void;
  onOpenTask?: (taskId: string) => void;
  onRetry?: (id: string) => void;
}

export function MessageBubble({ message: m, own, continued, onOpenThread, onReact, onOpenTask, onRetry }: MessageBubbleProps) {
  const time = fmtTime.format(new Date(m.sentAt));
  return (
    <article
      aria-label={`${m.author.name} at ${time}`}
      className={cn("group/msg flex gap-2.5 px-4", own && "flex-row-reverse", continued ? "pt-0.5" : "pt-3")}
    >
      <div className="w-8 shrink-0">{!continued && !own && <MemberAvatar member={m.author} size="lg" />}</div>
      <div className={cn("flex min-w-0 max-w-[min(560px,85%)] flex-col gap-1", own && "items-end")}>
        {!continued && (
          <p className={cn("flex items-baseline gap-2 text-xs", own && "flex-row-reverse")}>
            <span className="font-semibold text-emphasis">{own ? "You" : m.author.name}</span>
            <time dateTime={m.sentAt} className="text-subtle tabular-nums">{time}</time>
          </p>
        )}
        <div
          className={cn(
            "relative rounded-2xl px-3.5 py-2 text-sm leading-5 [overflow-wrap:anywhere]",
            own ? "rounded-tr-md bg-brand text-brand-fg" : "rounded-tl-md bg-subtle text-emphasis",
            continued && (own ? "rounded-tr-2xl" : "rounded-tl-2xl"),
            m.status === "failed" && "ring-2 ring-error-solid"
          )}
        >
          <p className="whitespace-pre-wrap"><RichBody text={m.body} own={own} /></p>
          {m.linkedTask && (
            <button
              type="button"
              onClick={() => onOpenTask?.(m.linkedTask!.id)}
              className={cn(
                "mt-2 flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs focus-ring",
                own ? "border-brand-fg/20 bg-brand-fg/10 hover:bg-brand-fg/15" : "border-subtle bg-default hover:border-default"
              )}
            >
              <StatusIndicator status={m.linkedTask.status} labelled />
              <span className="font-mono opacity-80">{m.linkedTask.key}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{m.linkedTask.title}</span>
              <span className="sr-only">, {TASK_STATUS_META[m.linkedTask.status].label}</span>
            </button>
          )}
          {m.attachments?.map((a) => (
            <p key={a.id} className={cn("mt-2 flex items-center gap-2 rounded-lg px-2 py-1 text-xs", own ? "bg-brand-fg/10" : "bg-default")}>
              <Paperclip aria-hidden className="size-3.5" />
              <span className="truncate font-medium">{a.name}</span>
              {a.size && <span className="opacity-70">{a.size}</span>}
            </p>
          ))}
        </div>
        {m.edited && <span className="text-2xs text-subtle">(edited)</span>}
        {m.status === "sending" && <span className="text-2xs text-subtle" role="status">Sending…</span>}
        {m.status === "failed" && (
          <span role="alert" className="text-2xs text-error-on-surface">
            Not sent. <button type="button" className="font-medium underline focus-ring" onClick={() => onRetry?.(m.id)}>Retry</button>
          </span>
        )}
        {(m.reactions?.length || m.replies?.count) ? (
          <div className={cn("flex flex-wrap items-center gap-1.5", own && "flex-row-reverse")}>
            {m.reactions?.map((r) => (
              <button
                key={r.emoji}
                type="button"
                aria-pressed={!!r.mine}
                aria-label={`${r.label ?? r.emoji} reaction, ${r.count}${r.mine ? ", including you" : ""}`}
                onClick={() => onReact?.(m.id, r.emoji)}
                className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs tabular-nums focus-ring", r.mine ? "border-brand/40 bg-brand/10 text-emphasis" : "border-subtle bg-default text-subtle hover:border-default")}
              >
                <span aria-hidden>{r.emoji}</span>{r.count}
              </button>
            ))}
            {m.replies?.count ? (
              <button type="button" onClick={() => onOpenThread?.(m.id)} className="inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium text-info-on-surface hover:bg-info-bg hover:text-info-fg focus-ring">
                {m.replies.participants && <span className="flex -space-x-1">{m.replies.participants.slice(0, 3).map((p) => <MemberAvatar key={p.id} member={p} size="xs" showPresence={false} />)}</span>}
                {m.replies.count} {m.replies.count === 1 ? "reply" : "replies"}
                {m.replies.lastAt && <span className="font-normal text-subtle">· last {fmtTime.format(new Date(m.replies.lastAt))}</span>}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={cn("flex shrink-0 items-start gap-0.5 pt-5 opacity-0 transition-opacity group-hover/msg:opacity-100 group-focus-within/msg:opacity-100", continued && "pt-1")}>
        {onReact && (
          <button type="button" aria-label="Add reaction" onClick={() => onReact(m.id, "👍")} className="inline-flex size-7 items-center justify-center rounded-md text-subtle hover:bg-subtle hover:text-emphasis focus-ring">
            <SmilePlus aria-hidden className="size-4" />
          </button>
        )}
        {onOpenThread && (
          <button type="button" aria-label="Reply in thread" onClick={() => onOpenThread(m.id)} className="inline-flex size-7 items-center justify-center rounded-md text-subtle hover:bg-subtle hover:text-emphasis focus-ring">
            <MessageSquareReply aria-hidden className="size-4" />
          </button>
        )}
      </div>
    </article>
  );
}

/** Day separator in a message list. */
export function MessageDivider({ label }: { label: string }) {
  return (
    <div role="separator" aria-label={label} className="flex items-center gap-3 px-4 py-3 text-2xs font-medium uppercase tracking-wide text-subtle">
      <span className="h-px flex-1 bg-border" />{label}<span className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ================================================================== */
/* ChatInputBar — @mention, #task, formatting, attachments             */
/* ================================================================== */
export interface ChatInputBarProps {
  members: WorkspaceMember[];
  tasks?: LinkedTask[];
  onSend: (payload: { text: string; files: File[] }) => void;
  placeholder?: string;
  /** e.g. "#general" — used in the accessible name. */
  channelName?: string;
  className?: string;
}

type Suggest = { kind: "user" | "task"; query: string; start: number } | null;

export function ChatInputBar({ members, tasks = [], onSend, placeholder = "Write a message…", channelName, className }: ChatInputBarProps) {
  const [text, setText] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [format, setFormat] = React.useState(false);
  const [suggest, setSuggest] = React.useState<Suggest>(null);
  const [active, setActive] = React.useState(0);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const listId = React.useId();

  const options =
    suggest?.kind === "user"
      ? members.filter((m) => m.name.toLowerCase().includes(suggest.query.toLowerCase())).slice(0, 6).map((m) => ({ id: m.id, label: m.name, insert: `@${m.name} `, node: <MemberAvatar member={m} size="xs" /> }))
      : suggest?.kind === "task"
        ? tasks.filter((t) => `${t.key} ${t.title}`.toLowerCase().includes(suggest.query.toLowerCase())).slice(0, 6).map((t) => ({ id: t.id, label: `${t.key} ${t.title}`, insert: `#${t.key} `, node: <StatusIndicator status={t.status} /> }))
        : [];

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const detect = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const m = /(^|\s)([@#])([\w-]*)$/.exec(before);
    if (m) { setSuggest({ kind: m[2] === "@" ? "user" : "task", query: m[3], start: caret - m[3].length - 1 }); setActive(0); }
    else setSuggest(null);
  };

  const pick = (i: number) => {
    const o = options[i];
    if (!o || !suggest || !ref.current) return;
    const caret = ref.current.selectionStart;
    const next = text.slice(0, suggest.start) + o.insert + text.slice(caret);
    setText(next);
    setSuggest(null);
    requestAnimationFrame(() => {
      const pos = suggest.start + o.insert.length;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  const wrap = (l: string, r = l) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    setText(text.slice(0, s) + l + text.slice(s, e) + r + text.slice(e));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + l.length, e + l.length); });
  };

  const send = () => {
    if (!text.trim() && !files.length) return;
    onSend({ text: text.trim(), files });
    setText("");
    setFiles([]);
    setSuggest(null);
  };

  const tool = "inline-flex size-7 items-center justify-center rounded-md text-subtle hover:bg-subtle hover:text-emphasis focus-ring aria-pressed:bg-emphasis aria-pressed:text-emphasis [&_svg]:size-4";

  return (
    <div className={cn("relative border-t border-subtle bg-default p-3", className)}>
      {suggest && options.length > 0 && (
        <ul id={listId} role="listbox" aria-label={suggest.kind === "user" ? "People" : "Tasks"} className="absolute bottom-full left-3 z-popover mb-2 w-72 rounded-xl border border-subtle bg-default p-1 shadow-elevation-3">
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(i); }}
              className={cn("flex h-8 cursor-default items-center gap-2 rounded-lg px-2 text-sm text-default", i === active && "bg-subtle text-emphasis")}
            >
              {o.node}<span className="truncate">{o.label}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-xl border border-control bg-default shadow-xs transition-colors focus-within:border-control-hover focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus/35">
        {format && (
          <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 border-b border-subtle px-1.5 py-1">
            <button type="button" className={tool} aria-label="Bold" onClick={() => wrap("**")}><Bold aria-hidden /></button>
            <button type="button" className={tool} aria-label="Italic" onClick={() => wrap("_")}><Italic aria-hidden /></button>
            <button type="button" className={tool} aria-label="Code" onClick={() => wrap("`")}><Code aria-hidden /></button>
            <button type="button" className={tool} aria-label="Bulleted list" onClick={() => wrap("\n- ", "")}><List aria-hidden /></button>
          </div>
        )}
        <textarea
          ref={ref}
          rows={1}
          value={text}
          aria-label={channelName ? `Message ${channelName}` : "Message"}
          placeholder={placeholder}
          /* Native multiline textbox (a textarea may not take role="combobox"); the suggestion
             listbox is linked via aria-controls + aria-activedescendant. */
          aria-controls={suggest ? listId : undefined}
          aria-activedescendant={suggest && options.length ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          onChange={(e) => { setText(e.target.value); detect(e.target.value, e.target.selectionStart); }}
          onKeyDown={(e) => {
            if (suggest && options.length) {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % options.length); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); return; }
              if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(active); return; }
              if (e.key === "Escape") { e.preventDefault(); setSuggest(null); return; }
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
          }}
          className="block max-h-[200px] w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-5 text-emphasis outline-none placeholder:text-muted"
        />
        {files.length > 0 && (
          <ul aria-label="Attachments" className="flex flex-wrap gap-1.5 px-3 pb-2">
            {files.map((f, i) => (
              <li key={i} className="inline-flex items-center gap-1 rounded-md bg-subtle py-0.5 pl-2 pr-0.5 text-xs text-default">
                <Paperclip aria-hidden className="size-3" />{f.name}
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((s) => s.filter((_, j) => j !== i))} className="inline-flex size-5 items-center justify-center rounded-sm hover:bg-emphasis focus-ring"><X aria-hidden className="size-3" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-0.5 px-1.5 pb-1.5">
          <button type="button" className={tool} aria-label="Formatting" aria-pressed={format} onClick={() => setFormat((f) => !f)}><Type aria-hidden /></button>
          <button type="button" className={tool} aria-label="Mention someone" onClick={() => { setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}@`); requestAnimationFrame(() => { ref.current?.focus(); const v = ref.current!.value; detect(v, v.length); }); }}><AtSign aria-hidden /></button>
          <button type="button" className={tool} aria-label="Link a task" onClick={() => { setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}#`); requestAnimationFrame(() => { ref.current?.focus(); const v = ref.current!.value; detect(v, v.length); }); }}><Hash aria-hidden /></button>
          <button type="button" className={tool} aria-label="Attach files" onClick={() => fileRef.current?.click()}><Paperclip aria-hidden /></button>
          <input ref={fileRef} type="file" multiple hidden tabIndex={-1} onChange={(e) => { setFiles((s) => [...s, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
          <span className="ml-auto hidden text-2xs text-subtle sm:inline"><kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift+Enter</kbd> new line</span>
          <button
            type="button"
            aria-label="Send message"
            disabled={!text.trim() && !files.length}
            onClick={send}
            className="ml-2 inline-flex size-8 items-center justify-center rounded-control bg-brand text-brand-fg shadow-xs transition-colors hover:bg-brand-emphasis focus-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"
          >
            <SendHorizontal aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* ChannelSidebar                                                      */
/* ================================================================== */
export interface ChannelItem { id: string; name: string; unread?: number; mentions?: number; muted?: boolean; private?: boolean }
export interface DirectItem { id: string; member: WorkspaceMember; unread?: number }

export interface ChannelSidebarProps {
  channels: ChannelItem[];
  directs: DirectItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  header?: React.ReactNode;
  className?: string;
}

export function ChannelSidebar({ channels, directs, activeId, onSelect, header, className }: ChannelSidebarProps) {
  const item = (id: string, content: React.ReactNode, name: string, unread?: number, mentions?: number) => {
    const active = id === activeId;
    return (
      <li key={id}>
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          aria-label={`${name}${unread ? `, ${unread} unread` : ""}${mentions ? `, ${mentions} mentions` : ""}`}
          onClick={() => onSelect(id)}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors focus-ring-inset",
            active ? "bg-emphasis font-medium text-emphasis" : unread ? "font-semibold text-emphasis hover:bg-subtle" : "text-default hover:bg-subtle"
          )}
        >
          {content}
          {mentions ? (
            <span aria-hidden className="ml-auto rounded-full bg-error-solid px-1.5 text-2xs font-semibold leading-4 text-error-on-solid tabular-nums">{mentions}</span>
          ) : unread ? (
            <span aria-hidden className="ml-auto rounded-full bg-emphasis px-1.5 text-2xs font-semibold leading-4 text-emphasis tabular-nums">{unread}</span>
          ) : null}
        </button>
      </li>
    );
  };
  return (
    <nav aria-label="Conversations" className={cn("flex h-full w-full flex-col gap-4 overflow-y-auto border-r border-subtle bg-muted p-3", className)}>
      {header}
      <div className="grid gap-0.5">
        <p className="text-xs font-medium text-muted-foreground px-2 pb-1 text-muted">Channels</p>
        <ul className="grid gap-0.5">
          {channels.map((c) => item(c.id, <><Hash aria-hidden className="size-4 shrink-0 text-subtle" /><span className={cn("truncate", c.muted && "opacity-60")}>{c.name}</span></>, `#${c.name}`, c.unread, c.mentions))}
        </ul>
      </div>
      <div className="grid gap-0.5">
        <p className="text-xs font-medium text-muted-foreground px-2 pb-1 text-muted">Direct messages</p>
        <ul className="grid gap-0.5">
          {directs.map((d) => item(d.id, <><MemberAvatar member={d.member} size="xs" /><span className="truncate">{d.member.name}</span></>, `${d.member.name}${d.member.presence ? `, ${d.member.presence}` : ""}`, d.unread))}
        </ul>
      </div>
    </nav>
  );
}
