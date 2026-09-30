"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, CloudOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * SaveStatus (v6.4) — the inline status of an autosaving surface (docs, notes, block editors).
 * It replaces a Save button: there is nothing to press. Put it in the page toolbar, before Share.
 * Surfaces with an explicit save use SaveBar instead.
 */
export type SaveStatusState = "saved" | "saving" | "error" | "offline";

const DEFAULT_MESSAGES: Record<SaveStatusState, string> = {
  saved: "Saved",
  saving: "Saving…",
  error: "Couldn’t save",
  offline: "Offline — changes are kept on this device",
};

export interface SaveStatusProps extends Omit<React.ComponentProps<"span">, "children"> {
  state: SaveStatusState;
  /** Override any message (e.g. Bahasa Indonesia copy). */
  messages?: Partial<Record<SaveStatusState, string>>;
  /** Shown as an inline "Try again" action in the error state. */
  onRetry?: () => void;
  retryLabel?: string;
}

export function SaveStatus({ state, messages, onRetry, retryLabel = "Try again", className, ...props }: SaveStatusProps) {
  const msg = { ...DEFAULT_MESSAGES, ...messages }[state];
  const Icon = state === "saved" ? CheckCircle2 : state === "saving" ? Loader2 : state === "offline" ? CloudOff : AlertCircle;
  return (
    <span
      role="status"
      aria-live="polite"
      data-slot="save-status"
      data-state={state}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        state === "error" ? "font-medium text-error-on-surface" : state === "offline" ? "text-attention-on-surface" : "text-muted-foreground",
        className
      )}
      {...props}
    >
      <Icon aria-hidden className={cn("size-3.5 shrink-0", state === "saving" && "animate-spin motion-reduce:animate-none")} />
      {msg}
      {state === "error" && onRetry && (
        <button type="button" onClick={onRetry} className="rounded-sm font-medium text-foreground underline underline-offset-4 hover:no-underline focus-ring">
          {retryLabel}
        </button>
      )}
    </span>
  );
}
