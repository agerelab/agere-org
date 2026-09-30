"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFileExplorer } from "./file-explorer-context";

export interface FileExplorerDropOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Listen on window (true) or only inside the explorer (false). */
  global?: boolean;
  title?: string;
  hint?: string;
}

/**
 * Full-surface overlay that appears only when OS files are dragged in.
 * Internal item drags (AGERE_ITEM_MIME) never trigger it.
 */
export const FileExplorerDropOverlay = React.forwardRef<HTMLDivElement, FileExplorerDropOverlayProps>(
  ({ global = true, title = "Drop files to upload", hint = "They'll upload to the folder you're viewing", className, ...props }, ref) => {
    const { onFilesDrop } = useFileExplorer();
    const [active, setActive] = React.useState(false);
    const depth = React.useRef(0);
    const reduce = useReducedMotion();

    React.useEffect(() => {
      const target: Window | null = global ? window : null;
      if (!target) return;
      const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
      const enter = (e: DragEvent) => { if (!hasFiles(e)) return; depth.current += 1; setActive(true); };
      const leave = (e: DragEvent) => { if (!hasFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (!depth.current) setActive(false); };
      const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
      const drop = (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setActive(false);
        if (e.dataTransfer?.files.length) onFilesDrop?.(Array.from(e.dataTransfer.files));
      };
      target.addEventListener("dragenter", enter);
      target.addEventListener("dragleave", leave);
      target.addEventListener("dragover", over);
      target.addEventListener("drop", drop);
      return () => {
        target.removeEventListener("dragenter", enter);
        target.removeEventListener("dragleave", leave);
        target.removeEventListener("dragover", over);
        target.removeEventListener("drop", drop);
      };
    }, [global, onFilesDrop]);

    return (
      <AnimatePresence>
        {active && (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.12 }}
            className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
          >
            <div
              ref={ref}
              role="status"
              className={cn("flex size-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-brand bg-brand/5 text-center", className)}
              {...props}
            >
              <span className="grid size-12 place-items-center rounded-full bg-brand/10 text-emphasis">
                <UploadCloud className="size-6" aria-hidden />
              </span>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
FileExplorerDropOverlay.displayName = "FileExplorerDropOverlay";
