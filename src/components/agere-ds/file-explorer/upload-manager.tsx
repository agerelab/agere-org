"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, RotateCw, X } from "lucide-react";

import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { UploadTask } from "./types";

/** Motion owns drag/animation handlers, so those DOM events are omitted. */
type MotionSafeDivProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

export interface UploadManagerProps extends MotionSafeDivProps {
  uploads: UploadTask[];
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  /** Close the panel (typically clears finished tasks). */
  onDismiss?: () => void;
  /** Position inside the nearest positioned ancestor instead of the viewport. */
  contained?: boolean;
}

function summarize(uploads: UploadTask[]) {
  const done = uploads.filter((u) => u.status === "success").length;
  const failed = uploads.filter((u) => u.status === "error").length;
  const active = uploads.length - done - failed;
  if (active) return `Uploading ${active} ${active > 1 ? "files" : "file"}${failed ? `, ${failed} failed` : ""}`;
  if (failed) return `${failed} upload${failed > 1 ? "s" : ""} failed`;
  return `${done} upload${done > 1 ? "s" : ""} complete`;
}

/** Floating upload queue — bottom-right, collapsible, with per-file retry. */
export const UploadManager = React.forwardRef<HTMLDivElement, UploadManagerProps>(
  ({ uploads, onRetry, onCancel, onDismiss, contained = false, className, ...props }, ref) => {
    const [open, setOpen] = React.useState(true);
    const reduce = useReducedMotion();
    const listId = React.useId();
    const summary = summarize(uploads);
    const running = uploads.some((u) => u.status === "uploading" || u.status === "queued");
    const overall = uploads.length ? Math.round(uploads.reduce((s, u) => s + (u.status === "success" ? 100 : u.progress), 0) / uploads.length) : 0;

    return (
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            ref={ref}
            role="region"
            aria-label="Uploads"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className={cn(
              contained ? "absolute" : "fixed",
              "bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-2xl",
              className
            )}
            {...props}
          >
            <div className="flex items-center gap-2 border-b px-3 py-2.5">
              {running ? (
                <Loader2 className="size-4 animate-spin text-subtle" aria-hidden />
              ) : uploads.some((u) => u.status === "error") ? (
                <AlertCircle className="size-4 text-destructive" aria-hidden />
              ) : (
                <CheckCircle2 className="size-4 text-success" aria-hidden />
              )}
              <p className="min-w-0 flex-1 truncate text-xs font-semibold" aria-live="polite">{summary}</p>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={listId} aria-label={open ? "Collapse uploads" : "Expand uploads"}>
                <ChevronDown aria-hidden className={cn("transition-transform", !open && "rotate-180")} />
              </Button>
              {onDismiss && !running && (
                <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Close uploads">
                  <X aria-hidden />
                </Button>
              )}
            </div>
            {running && !open && <Progress value={overall} className="rounded-none" aria-label="Overall upload progress" />}
            {open && (
              <ul id={listId} className="max-h-72 divide-y overflow-y-auto">
                {uploads.map((u) => (
                  <UploadRow key={u.id} upload={u} onRetry={onRetry} onCancel={onCancel} />
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
UploadManager.displayName = "UploadManager";

function UploadRow({ upload: u, onRetry, onCancel }: { upload: UploadTask; onRetry?: (id: string) => void; onCancel?: (id: string) => void }) {
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{u.name}</p>
          <p className={cn("text-2xs text-muted-foreground", u.status === "error" && "text-destructive")}>
            {u.status === "error"
              ? u.error ?? "Upload failed. Check your connection and retry."
              : u.status === "success"
                ? `${formatBytes(u.size)} uploaded`
                : u.status === "queued"
                  ? "Waiting…"
                  : `${formatBytes((u.size * u.progress) / 100)} of ${formatBytes(u.size)}`}
          </p>
        </div>
        {u.status === "success" && <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Uploaded" role="img" />}
        {u.status === "error" && onRetry && (
          <Button variant="outline" size="sm" onClick={() => onRetry(u.id)} aria-label={`Retry ${u.name}`}>
            <RotateCw aria-hidden /> Retry
          </Button>
        )}
        {(u.status === "uploading" || u.status === "queued") && onCancel && (
          <Button variant="ghost" size="icon-sm" onClick={() => onCancel(u.id)} aria-label={`Cancel ${u.name}`}>
            <X aria-hidden />
          </Button>
        )}
      </div>
      {(u.status === "uploading" || u.status === "error") && (
        <Progress
          value={u.progress}
          tone={u.status === "error" ? "destructive" : "default"}
          className="mt-2"
          aria-label={`${u.name} progress`}
        />
      )}
    </li>
  );
}
