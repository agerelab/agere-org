"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CornerDownLeft, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon?: React.ReactNode;
  hint?: string;
  shortcut?: string;
  keywords?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  items: CommandItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Global shortcut. Default ⌘K / Ctrl+K. Set false to disable. */
  hotkey?: string | false;
  placeholder?: string;
  emptyLabel?: string;
}

/**
 * ⌘K palette (WAI-ARIA combobox + listbox). ↑/↓ move, Enter runs, Esc closes.
 * The active option is tracked with aria-activedescendant so focus stays in the input.
 */
export function CommandPalette({ items, open: openProp, onOpenChange, hotkey = "k", placeholder = "Search or jump to…", emptyLabel = "No results" }: CommandPaletteProps) {
  const [inner, setInner] = React.useState(false);
  const open = openProp ?? inner;
  const setOpen = (o: boolean) => { onOpenChange?.(o); if (openProp === undefined) setInner(o); };
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  React.useEffect(() => {
    if (!hotkey) return;
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === hotkey) { e.preventDefault(); setOpen(!open); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? items.filter((i) => `${i.label} ${i.group} ${i.keywords ?? ""}`.toLowerCase().includes(t)) : items;
  }, [items, q]);
  const groups = React.useMemo(() => {
    const m = new Map<string, CommandItem[]>();
    filtered.forEach((i) => m.set(i.group, [...(m.get(i.group) ?? []), i]));
    return Array.from(m.entries());
  }, [filtered]);

  React.useEffect(() => setActive(0), [q]);
  React.useEffect(() => { if (!open) setQ(""); }, [open]);
  React.useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, listId]);

  const run = (i?: CommandItem) => { if (!i) return; setOpen(false); i.onSelect(); };

  let idx = -1;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-overlay/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-modal w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Command menu</DialogPrimitive.Title>
          <div className="flex h-12 items-center gap-2 border-b border-border px-3">
            <Search aria-hidden className="size-4 shrink-0 opacity-50" />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={filtered.length ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
              aria-label="Search commands"
              placeholder={placeholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === "Home") { e.preventDefault(); setActive(0); }
                if (e.key === "End") { e.preventDefault(); setActive(filtered.length - 1); }
                if (e.key === "Enter") { e.preventDefault(); run(filtered[active]); }
              }}
              className="h-11 flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded-sm border border-default bg-muted px-1.5 py-0.5 text-2xs font-medium text-subtle">Esc</kbd>
          </div>
          <div id={listId} role="listbox" aria-label="Results" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground" role="status">{emptyLabel} for “{q}”</p>}
            {groups.map(([group, list]) => (
              <div key={group} role="group" aria-label={group} className="pb-1">
                <p aria-hidden className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{group}</p>
                {list.map((item) => {
                  idx += 1;
                  const i = idx;
                  const on = i === active;
                  return (
                    <div
                      key={item.id}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={on}
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(item)}
                      className={cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground", on && "bg-accent text-accent-foreground")}
                    >
                      {item.icon && <span aria-hidden className="inline-flex">{item.icon}</span>}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint && <span className="truncate text-xs text-subtle">{item.hint}</span>}
                      {item.shortcut && <kbd className="rounded-sm border border-default bg-muted px-1.5 py-0.5 text-2xs text-subtle">{item.shortcut}</kbd>}
                      {on && <CornerDownLeft aria-hidden className="!size-3.5" />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span><kbd className="font-sans">↑↓</kbd> navigate</span><span><kbd className="font-sans">↵</kbd> open</span><span><kbd className="font-sans">esc</kbd> close</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Search-bar trigger that looks like an input and shows the ⌘K hint (ClickUp top bar). */
export function CommandTrigger({ onClick, label = "Search", shortcut = "⌘K", className }: { onClick: () => void; label?: string; shortcut?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-keyshortcuts="Meta+K Control+K"
      className={cn("flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 text-sm text-muted-foreground shadow-none outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-ring", className)}
    >
      <Search aria-hidden className="size-4" />
      <span className="flex-1 truncate text-left">{label}</span>
      <kbd aria-hidden className="inline-flex h-5 items-center rounded-sm border border-border bg-background px-1.5 font-sans text-xs font-medium">{shortcut}</kbd>
    </button>
  );
}
