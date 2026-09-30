"use client";

import * as React from "react";
import type { CellContext } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import "./types";

/**
 * Drop-in `cell` renderer for editable columns.
 * Set `meta.editor` on the column; commit fires `meta.updateData` on the table.
 * Enter / double-click to edit · Enter or blur to save · Escape to cancel.
 */
export function EditableCell<TData, TValue>({ getValue, row, column, table }: CellContext<TData, TValue>) {
  const initial = getValue();
  const editor = column.columnDef.meta?.editor ?? "text";
  const options = column.columnDef.meta?.options ?? [];
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(initial == null ? "" : String(initial));
  const readRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!editing) setDraft(initial == null ? "" : String(initial));
  }, [initial, editing]);

  const commit = () => {
    setEditing(false);
    const value = editor === "number" ? (draft === "" ? null : Number(draft)) : draft;
    if (String(value ?? "") !== String(initial ?? "")) table.options.meta?.updateData?.(row.id, column.id, value);
    requestAnimationFrame(() => readRef.current?.focus());
  };
  const cancel = () => {
    setEditing(false);
    setDraft(initial == null ? "" : String(initial));
    requestAnimationFrame(() => readRef.current?.focus());
  };

  const label = column.columnDef.meta?.label ?? column.id;
  const display = editor === "select" ? options.find((o) => o.value === initial)?.label ?? String(initial ?? "") : String(initial ?? "");

  if (!editing) {
    return (
      <button
        ref={readRef}
        type="button"
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); setEditing(true); }
        }}
        aria-label={`${label}: ${display || "empty"}. Press Enter to edit.`}
        className="-mx-1 block h-7 w-[calc(100%+0.5rem)] truncate rounded-sm px-1 text-left hover:bg-foreground/[0.04] focus-ring"
      >
        {display || <span className="text-muted-foreground">Empty</span>}
      </button>
    );
  }

  const shared = {
    autoFocus: true,
    "aria-label": `Edit ${label}`,
    onBlur: commit,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
    },
    className: cn(
      "-mx-1 h-7 w-[calc(100%+0.5rem)] rounded-sm border border-ring bg-background px-1 text-xs text-foreground outline-none ring-2 ring-ring/25"
    ),
  };

  if (editor === "select") {
    return (
      <select {...shared} value={draft} onChange={(e) => setDraft(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      {...shared}
      type={editor === "number" ? "number" : editor === "date" ? "date" : "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
    />
  );
}
