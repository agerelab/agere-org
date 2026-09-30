"use client";

import * as React from "react";
import { ChevronRight, FolderClosed } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFileExplorer } from "./file-explorer-context";
import type { FileTreeNode } from "./types";
import { AGERE_ITEM_MIME } from "./utils";

/* ================================================================== */
/* Sidebar shell                                                       */
/* ================================================================== */

export const FileExplorerSidebar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <aside
      ref={ref}
      aria-label="File navigation"
      className={cn(
        "flex gap-1 overflow-x-auto border-b bg-sidebar p-2 text-sidebar-foreground md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-3",
        className
      )}
      {...props}
    />
  )
);
FileExplorerSidebar.displayName = "FileExplorerSidebar";

export interface FileExplorerNavSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
}

export const FileExplorerNavSection = React.forwardRef<HTMLDivElement, FileExplorerNavSectionProps>(
  ({ label, className, children, ...props }, ref) => {
    const id = React.useId();
    return (
      <div ref={ref} role="group" aria-labelledby={id} className={cn("flex shrink-0 gap-1 md:mb-3 md:flex-col", className)} {...props}>
        <p id={id} className="hidden px-2 pb-1 pt-2 text-2xs font-medium text-muted-foreground md:block">{label}</p>
        {children}
      </div>
    );
  }
);
FileExplorerNavSection.displayName = "FileExplorerNavSection";

/* ================================================================== */
/* Drop-target hook (internal items + OS files)                         */
/* ================================================================== */

function useFolderDrop(targetId: string, enabled: boolean) {
  const { onMoveItems, onFilesDrop } = useFileExplorer();
  const [over, setOver] = React.useState(false);
  if (!enabled) return { over: false, handlers: {} };
  return {
    over,
    handlers: {
      onDragOver: (e: React.DragEvent) => {
        const types = Array.from(e.dataTransfer.types);
        if (!types.includes(AGERE_ITEM_MIME) && !types.includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = types.includes("Files") ? "copy" : "move";
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        if (e.dataTransfer.files.length) return onFilesDrop?.(Array.from(e.dataTransfer.files), targetId);
        const raw = e.dataTransfer.getData(AGERE_ITEM_MIME);
        if (raw) onMoveItems?.(JSON.parse(raw) as string[], targetId);
      },
    },
  };
}

const navItemBase = cn(
  "flex h-8 w-auto shrink-0 items-center md:w-full gap-2 whitespace-nowrap rounded-md px-2 text-left text-xs transition-colors duration-fast",
  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "focus-ring-inset",
  "aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground",
  "data-[drop-over]:bg-brand/5 data-[drop-over]:outline-dashed data-[drop-over]:outline-2 data-[drop-over]:-outline-offset-2 data-[drop-over]:outline-brand",
  "[&_svg]:size-3.5 [&_svg]:shrink-0"
);

/* ================================================================== */
/* Flat nav item                                                       */
/* ================================================================== */

export interface FileExplorerNavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  active?: boolean;
  /** Folder id for drop handling; enables drop target when set. */
  dropTargetId?: string;
}

export const FileExplorerNavItem = React.forwardRef<HTMLButtonElement, FileExplorerNavItemProps>(
  ({ icon, active, dropTargetId, className, children, ...props }, ref) => {
    const { over, handlers } = useFolderDrop(dropTargetId ?? "", !!dropTargetId);
    return (
      <button
        ref={ref}
        type="button"
        aria-current={active ? "page" : undefined}
        data-drop-over={over || undefined}
        className={cn(navItemBase, className)}
        {...handlers}
        {...props}
      >
        {icon}
        <span className="truncate">{children}</span>
      </button>
    );
  }
);
FileExplorerNavItem.displayName = "FileExplorerNavItem";

/* ================================================================== */
/* Tree (role="tree") with arrow-key navigation                        */
/* ================================================================== */

export interface FileExplorerTreeProps extends Omit<React.HTMLAttributes<HTMLUListElement>, "onSelect"> {
  nodes: FileTreeNode[];
  activeId?: string;
  onSelect?: (id: string) => void;
  defaultExpanded?: string[];
  label?: string;
}

export const FileExplorerTree = React.forwardRef<HTMLUListElement, FileExplorerTreeProps>(
  ({ nodes, activeId, onSelect, defaultExpanded = [], label = "Folders", className, ...props }, ref) => {
    const [expanded, setExpanded] = React.useState(() => new Set(defaultExpanded));
    const toggle = (id: string, open?: boolean) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        (open ?? !next.has(id)) ? next.add(id) : next.delete(id);
        return next;
      });

    const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
      const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"] > [data-tree-row]'));
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (i < 0) return;
      const row = items[i];
      const id = row.dataset.id!;
      const hasChildren = row.dataset.branch === "true";
      const move = (to: number) => items[Math.max(0, Math.min(items.length - 1, to))]?.focus();
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); move(i + 1); break;
        case "ArrowUp": e.preventDefault(); move(i - 1); break;
        case "Home": e.preventDefault(); move(0); break;
        case "End": e.preventDefault(); move(items.length - 1); break;
        case "ArrowRight":
          e.preventDefault();
          if (hasChildren && !expanded.has(id)) toggle(id, true);
          else if (hasChildren) move(i + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (hasChildren && expanded.has(id)) toggle(id, false);
          else (row.closest('[role="group"]')?.parentElement?.querySelector("[data-tree-row]") as HTMLElement | null)?.focus();
          break;
      }
    };

    return (
      <ul ref={ref} role="tree" aria-label={label} onKeyDown={onKeyDown} className={cn("flex gap-1 md:flex-col", className)} {...props}>
        {nodes.map((node) => (
          <TreeNode key={node.id} node={node} level={1} activeId={activeId} expanded={expanded} toggle={toggle} onSelect={onSelect} />
        ))}
      </ul>
    );
  }
);
FileExplorerTree.displayName = "FileExplorerTree";

interface TreeNodeProps {
  node: FileTreeNode;
  level: number;
  activeId?: string;
  expanded: Set<string>;
  toggle: (id: string, open?: boolean) => void;
  onSelect?: (id: string) => void;
}

function TreeNode({ node, level, activeId, expanded, toggle, onSelect }: TreeNodeProps) {
  const branch = !!node.children?.length;
  const open = expanded.has(node.id);
  const { over, handlers } = useFolderDrop(node.id, node.droppable ?? true);
  const isFirstRoot = level === 1;

  return (
    <li role="treeitem" aria-expanded={branch ? open : undefined} aria-selected={activeId === node.id} aria-level={level} className="list-none">
      <button
        type="button"
        data-tree-row=""
        data-id={node.id}
        data-branch={branch}
        tabIndex={activeId ? (activeId === node.id ? 0 : -1) : isFirstRoot ? 0 : -1}
        aria-current={activeId === node.id ? "page" : undefined}
        data-drop-over={over || undefined}
        onClick={() => {
          onSelect?.(node.id);
          if (branch) toggle(node.id);
        }}
        className={navItemBase}
        style={{ paddingLeft: 8 + (level - 1) * 12 }}
        {...handlers}
      >
        <ChevronRight
          aria-hidden
          className={cn("transition-transform duration-fast", open && "rotate-90", !branch && "invisible")}
        />
        {node.icon ?? <FolderClosed aria-hidden className="text-brand-accent" />}
        <span className="truncate">{node.label}</span>
      </button>
      {branch && open && (
        <ul role="group" className="hidden flex-col gap-0.5 md:flex">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} activeId={activeId} expanded={expanded} toggle={toggle} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}
