"use client";

// Comment box with @mentions (PRD-06 §5 Should, PRD-10 §5): typing "@" lists the people who can open
// the project; ↑/↓ choose, Enter or Tab insert "@Nama ", Esc closes. Enter without the list sends.
import * as React from "react";
import { SendHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { translator } from "@/i18n";
import { mentionQuery, type Mentionable } from "@/modules/space/mentions";

type T = ReturnType<typeof translator>;

export function CommentComposer({ t, value, onChange, onSend, people, pending }: { t: T; value: string; onChange: (v: string) => void; onSend: () => void; people: Mentionable[]; pending: boolean }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = React.useState(0);
  const [active, setActive] = React.useState(0);
  const [closed, setClosed] = React.useState(false);
  const q = mentionQuery(value, caret);
  const matches = q ? people.filter((p) => p.name.toLowerCase().includes(q.query.toLowerCase())).slice(0, 6) : [];
  const open = !closed && !!q && matches.length > 0;
  const listId = "f-comment-mentions";

  const pick = (p: Mentionable) => {
    if (!q) return;
    const next = `${value.slice(0, q.start)}@${p.name} ${value.slice(caret)}`;
    const at = q.start + p.name.length + 2;
    onChange(next);
    setCaret(at);
    requestAnimationFrame(() => ref.current?.setSelectionRange(at, at));
  };

  return (
    <div className="relative">
      {open && (
        <ul id={listId} role="listbox" aria-label={t("mention.list")} className="absolute bottom-full left-0 z-popover mb-1 grid w-64 gap-0.5 rounded-lg border border-default bg-default p-1 shadow-elevation-3">
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm", i === active && "bg-subtle")}
            >
              <Avatar name={p.name} size="xs" aria-hidden />
              <span className="truncate">{p.name}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2 rounded-md border border-control bg-default p-2">
        <textarea
          ref={ref}
          id="f-comment"
          rows={2}
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${listId}-${Math.min(active, matches.length - 1)}` : undefined}
          aria-describedby="f-comment-hint"
          onChange={(e) => {
            onChange(e.target.value);
            setCaret(e.target.selectionStart);
            setActive(0);
            setClosed(false);
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (open) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => (a + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pick(matches[Math.min(active, matches.length - 1)]);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setClosed(true);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          className="min-h-10 flex-1 resize-none bg-transparent text-sm outline-none"
        />
        <IconButton type="submit" size="sm" variant="default" label={t("task.send")} icon={<SendHorizontal />} disabled={pending || !value.trim()} />
      </div>
    </div>
  );
}

/** A comment with the names it mentions in bold. */
export function CommentBody({ body, people }: { body: string; people: Mentionable[] }) {
  const names = [...people].map((p) => p.name).sort((a, b) => b.length - a.length);
  if (!names.length) return <>{body}</>;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = body.split(new RegExp(`(@(?:${escaped.join("|")}))(?![\\p{L}\\p{N}])`, "giu"));
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-emphasis">{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>))}
    </>
  );
}
