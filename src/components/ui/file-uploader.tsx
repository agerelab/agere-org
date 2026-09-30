"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, File as FileIcon, RotateCcw, UploadCloud, X } from "lucide-react";

import { cn, formatBytes } from "@/lib/utils";
import { Progress } from "./progress";

export interface UploaderFile {
  id: string;
  name: string;
  size: number;
  status: "queued" | "uploading" | "success" | "error";
  progress?: number;
  error?: string;
}

export interface FileUploaderProps {
  files: UploaderFile[];
  /** Validated files only. Rejections are reported through `onReject`. */
  onFilesAdded: (files: File[]) => void;
  onReject?: (rejections: { file: File; reason: string }[]) => void;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  /** e.g. "image/*,.pdf" — also shown as help text. */
  accept?: string;
  /** Bytes. */
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true;
  return accept.split(",").map((a) => a.trim().toLowerCase()).some((rule) => {
    if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule);
    if (rule.endsWith("/*")) return file.type.startsWith(rule.slice(0, -1));
    return file.type === rule;
  });
}

/**
 * Dropzone + file list. The dropzone is a real <button> (Enter/Space opens the picker);
 * drag-and-drop is an enhancement, never the only path. Status changes are announced.
 */
export function FileUploader({
  files, onFilesAdded, onReject, onRemove, onRetry, accept, maxSize, multiple = true, disabled,
  label = "Upload files", hint, className,
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const hintId = React.useId();

  const handle = (list: FileList | null) => {
    if (!list) return;
    const ok: File[] = [];
    const rejected: { file: File; reason: string }[] = [];
    Array.from(list).forEach((f) => {
      if (!matchesAccept(f, accept)) rejected.push({ file: f, reason: `${f.name}: file type not supported` });
      else if (maxSize && f.size > maxSize) rejected.push({ file: f, reason: `${f.name}: larger than ${formatBytes(maxSize)}` });
      else ok.push(f);
    });
    if (ok.length) onFilesAdded(multiple ? ok : ok.slice(0, 1));
    if (rejected.length) onReject?.(rejected);
    setAnnouncement(
      [ok.length ? `${ok.length} file${ok.length > 1 ? "s" : ""} added` : "", rejected.length ? `${rejected.length} rejected` : ""].filter(Boolean).join(", ")
    );
  };

  const helper = hint ?? [accept && `Accepted: ${accept}`, maxSize && `Max ${formatBytes(maxSize)} each`].filter(Boolean).join(" · ");

  return (
    <div className={cn("grid gap-3", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-describedby={helper ? hintId : undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) handle(e.dataTransfer.files); }}
        data-dragging={dragging || undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-transparent px-6 py-8 text-center transition-colors duration-base",
          "hover:bg-accent/50 focus-ring",
          "data-[dragging]:border-primary data-[dragging]:bg-accent",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span aria-hidden className="grid size-10 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-xs">
          <UploadCloud className="size-5" />
        </span>
        <span className="text-sm text-default">
          <span className="font-semibold text-emphasis">{label}</span> or drag and drop
        </span>
        {helper && <span id={hintId} className="text-xs text-subtle">{helper}</span>}
      </button>
      <input ref={inputRef} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { handle(e.target.files); e.target.value = ""; }} tabIndex={-1} />
      <p role="status" className="sr-only">{announcement}</p>

      {files.length > 0 && (
        <ul className="grid gap-2" aria-label="Files">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-subtle bg-default p-3 shadow-elevation-1">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md bg-subtle text-subtle">
                <FileIcon className="size-4" />
              </span>
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-emphasis">{f.name}</span>
                  <span className="shrink-0 text-xs text-subtle tabular-nums">{formatBytes(f.size)}</span>
                </div>
                {f.status === "uploading" && <Progress value={f.progress ?? 0} aria-label={`Uploading ${f.name}`} />}
                {f.status === "queued" && <span className="text-xs text-subtle">Waiting…</span>}
                {f.status === "error" && (
                  <span className="flex items-center gap-1 text-xs text-error-on-surface"><AlertCircle aria-hidden className="size-3.5" />{f.error ?? "Upload failed"}</span>
                )}
                {f.status === "success" && (
                  <span className="flex items-center gap-1 text-xs text-success-on-surface"><CheckCircle2 aria-hidden className="size-3.5" />Uploaded</span>
                )}
              </div>
              {f.status === "error" && onRetry && (
                <button type="button" aria-label={`Retry ${f.name}`} onClick={() => onRetry(f.id)} className="inline-flex size-7 items-center justify-center rounded-control text-subtle hover:bg-subtle hover:text-emphasis focus-ring [&_svg]:size-4">
                  <RotateCcw aria-hidden />
                </button>
              )}
              {onRemove && (
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemove(f.id)} className="inline-flex size-7 items-center justify-center rounded-control text-subtle hover:bg-subtle hover:text-emphasis focus-ring [&_svg]:size-4">
                  <X aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
