"use client";

import * as React from "react";

import type { KanbanCardData, KanbanColumnData } from "./types";

export interface KanbanContextValue {
  columns: KanbanColumnData[];
  readOnly: boolean;
  query: string;
  setQuery: (q: string) => void;
  /** Search is active → DnD is paused so indices stay truthful. */
  dragDisabled: boolean;
  activeCardId: string | null;
  matches: (card: KanbanCardData) => boolean;
  onCardClick?: (cardId: string) => void;
  onCardCreate?: (columnId: string) => void;
  onColumnRename?: (columnId: string, title: string) => void;
  onColumnDelete?: (columnId: string) => void;
  onColumnCollapse?: (columnId: string, collapsed: boolean) => void;
}

export const KanbanContext = React.createContext<KanbanContextValue | null>(null);

export function useKanban(): KanbanContextValue {
  const ctx = React.useContext(KanbanContext);
  if (!ctx) throw new Error("Kanban compound components must be rendered inside <Kanban>.");
  return ctx;
}
