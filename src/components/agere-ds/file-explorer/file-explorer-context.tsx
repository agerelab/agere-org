"use client";

import * as React from "react";

import type { FileExplorerView } from "./types";

export interface SelectOptions {
  /** Ctrl/Cmd — toggle without clearing. */
  additive?: boolean;
  /** Shift — select the range from the last anchor within `scope`. */
  range?: boolean;
  /** Ordered ids the range is computed against (the item's group). */
  scope?: string[];
}

export interface FileExplorerContextValue {
  view: FileExplorerView;
  setView: (view: FileExplorerView) => void;
  selection: ReadonlySet<string>;
  select: (id: string, options?: SelectOptions) => void;
  setSelection: (ids: Iterable<string>) => void;
  clearSelection: () => void;
  query: string;
  setQuery: (q: string) => void;
  onOpenItem?: (id: string) => void;
  onMoveItems?: (itemIds: string[], targetId: string) => void;
  onFilesDrop?: (files: File[], targetId?: string) => void;
}

export const FileExplorerContext = React.createContext<FileExplorerContextValue | null>(null);

export function useFileExplorer(): FileExplorerContextValue {
  const ctx = React.useContext(FileExplorerContext);
  if (!ctx) throw new Error("FileExplorer compound components must be rendered inside <FileExplorer>.");
  return ctx;
}
