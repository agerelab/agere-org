"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * SaveBar (v6.4) — sticky footer for long editors and settings forms with an explicit save.
 * The status line is a polite live region; Cancel and Save are disabled while nothing is unsaved.
 * Pages that autosave (docs, notes) show their status in the page toolbar instead and don't use a SaveBar.
 */
export type SaveBarState = "saved" | "dirty" | "saving" | "error";

const DEFAULT_MESSAGES: Record<SaveBarState, string> = {
  saved: "All changes saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn’t save. Try again.",
};

export interface SaveBarProps extends Omit<React.ComponentProps<"div">, "children"> {
  state: SaveBarState;
  onSave: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  /** Override any status message (e.g. Bahasa Indonesia copy). */
  messages?: Partial<Record<SaveBarState, string>>;
  /** Accessible name of the region. */
  label?: string;
  /** Stick to the bottom of the scroll container (default true). */
  sticky?: boolean;
}

export function SaveBar({
  state, onSave, onCancel, saveLabel = "Save changes", cancelLabel = "Cancel", messages, label = "Save changes", sticky = true, className, ...props
}: SaveBarProps) {
  const msg = { ...DEFAULT_MESSAGES, ...messages }[state];
  const Icon = state === "saved" ? CheckCircle2 : state === "saving" ? Loader2 : AlertCircle;
  const idle = state === "saved";
  return (
    <div
      role="region"
      aria-label={label}
      data-slot="save-bar"
      data-state={state}
      className={cn(
        "z-10 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6",
        sticky && "sticky bottom-0",
        className
      )}
      {...props}
    >
      <p
        data-slot="save-bar-status"
        aria-live="polite"
        className={cn(
          "mr-auto inline-flex items-center gap-1.5 text-sm",
          state === "dirty" ? "font-medium text-attention-on-surface" : state === "error" ? "font-medium text-error-on-surface" : "text-muted-foreground"
        )}
      >
        <Icon aria-hidden className={cn("size-4", state === "saving" && "animate-spin motion-reduce:animate-none")} />
        {msg}
      </p>
      {onCancel && (
        <Button variant="ghost" onClick={onCancel} disabled={idle || state === "saving"}>
          {cancelLabel}
        </Button>
      )}
      <Button onClick={onSave} disabled={idle} loading={state === "saving"}>
        {saveLabel}
      </Button>
    </div>
  );
}
