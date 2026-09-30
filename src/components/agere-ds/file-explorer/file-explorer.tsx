"use client";

import * as React from "react";
import {
  ChevronDown, File, FileArchive, FileCode2, FileImage, FileSpreadsheet, FileText, FileVideo,
  Folder, LayoutGrid, List, Search, Upload, X, type LucideIcon,
} from "lucide-react";

import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { FileExplorerContext, useFileExplorer, type FileExplorerContextValue, type SelectOptions } from "./file-explorer-context";
import type { FileExplorerView, FileItem, FileKind } from "./types";
import { AGERE_ITEM_MIME } from "./utils";

/* ================================================================== */
/* <FileExplorer> root — shell grid + selection model                  */
/* ================================================================== */

export interface FileExplorerProps extends React.HTMLAttributes<HTMLDivElement> {
  view?: FileExplorerView;
  defaultView?: FileExplorerView;
  onViewChange?: (view: FileExplorerView) => void;
  selection?: string[];
  onSelectionChange?: (ids: string[]) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  onOpenItem?: (id: string) => void;
  /** Internal drag: items dropped onto a sidebar folder. */
  onMoveItems?: (itemIds: string[], targetId: string) => void;
  /** OS files dropped anywhere (targetId set when dropped on a folder). */
  onFilesDrop?: (files: File[], targetId?: string) => void;
}

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = React.useState(defaultValue);
  const current = value ?? inner;
  const set = React.useCallback(
    (next: T) => {
      if (value === undefined) setInner(next);
      onChange?.(next);
    },
    [value, onChange]
  );
  return [current, set] as const;
}

export const FileExplorer = React.forwardRef<HTMLDivElement, FileExplorerProps>(
  (
    {
      view: viewProp, defaultView = "grid", onViewChange,
      selection: selectionProp, onSelectionChange,
      query: queryProp, onQueryChange,
      onOpenItem, onMoveItems, onFilesDrop,
      className, children, onKeyDown, ...props
    },
    ref
  ) => {
    const [view, setView] = useControllable(viewProp, defaultView, onViewChange);
    const [query, setQuery] = useControllable(queryProp, "", onQueryChange);
    const [selectionArr, setSelectionArr] = useControllable(selectionProp, [] as string[], onSelectionChange);
    const selection = React.useMemo(() => new Set(selectionArr), [selectionArr]);
    const anchor = React.useRef<string | null>(null);

    const select = React.useCallback(
      (id: string, { additive, range, scope }: SelectOptions = {}) => {
        if (range && anchor.current && scope) {
          const a = scope.indexOf(anchor.current);
          const b = scope.indexOf(id);
          if (a >= 0 && b >= 0) {
            const [from, to] = a < b ? [a, b] : [b, a];
            const next = new Set(additive ? selection : []);
            scope.slice(from, to + 1).forEach((x) => next.add(x));
            return setSelectionArr([...next]);
          }
        }
        anchor.current = id;
        if (additive) {
          const next = new Set(selection);
          next.has(id) ? next.delete(id) : next.add(id);
          return setSelectionArr([...next]);
        }
        setSelectionArr([id]);
      },
      [selection, setSelectionArr]
    );

    const ctx: FileExplorerContextValue = {
      view, setView, selection, select,
      setSelection: (ids) => setSelectionArr([...ids]),
      clearSelection: () => setSelectionArr([]),
      query, setQuery, onOpenItem, onMoveItems, onFilesDrop,
    };

    return (
      <FileExplorerContext.Provider value={ctx}>
        <div
          ref={ref}
          data-agere-component="file-explorer"
          className={cn(
            "relative grid min-h-[480px] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-rows-1 rounded-xl border bg-background text-foreground md:grid-cols-[208px_minmax(0,1fr)]",
            className
          )}
          onKeyDown={(e) => {
            if (e.key === "Escape" && selection.size) ctx.clearSelection();
            onKeyDown?.(e);
          }}
          {...props}
        >
          {children}
          <p className="sr-only" aria-live="polite">
            {selection.size ? `${selection.size} selected` : ""}
          </p>
        </div>
      </FileExplorerContext.Provider>
    );
  }
);
FileExplorer.displayName = "FileExplorer";

/* ================================================================== */
/* Main column + Command bar + Status bar                              */
/* ================================================================== */

export const FileExplorerMain = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex min-w-0 flex-col", className)} {...props} />
);
FileExplorerMain.displayName = "FileExplorerMain";

export interface FileExplorerCommandBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Breadcrumb / location slot on the left. */
  location?: React.ReactNode;
  /** Actions shown only while something is selected (Move, Share, Delete…). */
  selectionActions?: React.ReactNode;
  onUploadClick?: () => void;
  searchPlaceholder?: string;
}

export const FileExplorerCommandBar = React.forwardRef<HTMLDivElement, FileExplorerCommandBarProps>(
  ({ location, selectionActions, onUploadClick, searchPlaceholder = "Search files and folders", className, children, ...props }, ref) => {
    const { query, setQuery, selection, clearSelection } = useFileExplorer();
    return (
      <div ref={ref} role="toolbar" aria-label="File actions" className={cn("flex flex-wrap items-center gap-2 border-b bg-card px-3 py-2.5", className)} {...props}>
        {location && <div className="min-w-0 text-xs font-semibold">{location}</div>}
        <div className="order-first w-full min-w-[180px] flex-1 sm:order-none sm:w-auto">
          <Input
            type="search"
            size="md"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            leadingIcon={<Search />}
          />
        </div>
        {selection.size > 0 ? (
          <div className="flex items-center gap-1.5 rounded-control bg-emphasis py-0.5 pl-2.5 pr-0.5">
            <span className="text-sm font-medium text-emphasis">{selection.size} selected</span>
            {selectionActions}
            <Button variant="ghost" size="icon-sm" onClick={clearSelection} aria-label="Clear selection">
              <X aria-hidden />
            </Button>
          </div>
        ) : null}
        <FileExplorerViewSwitcher />
        {children}
        {onUploadClick && (
          <Button onClick={onUploadClick}>
            <Upload aria-hidden /> Upload
          </Button>
        )}
      </div>
    );
  }
);
FileExplorerCommandBar.displayName = "FileExplorerCommandBar";

export const FileExplorerViewSwitcher = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { view, setView } = useFileExplorer();
    const options: Array<[FileExplorerView, string, LucideIcon]> = [
      ["grid", "Grid view", LayoutGrid],
      ["list", "List view", List],
    ];
    return (
      <div ref={ref} role="group" aria-label="Layout" className={cn("inline-flex rounded-md border p-0.5", className)} {...props}>
        {options.map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            aria-label={label}
            onClick={() => setView(value)}
            className={cn(
              "grid size-7 place-items-center rounded-sm text-muted-foreground transition-colors",
              "hover:text-foreground focus-ring",
              view === value && "bg-muted text-foreground"
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        ))}
      </div>
    );
  }
);
FileExplorerViewSwitcher.displayName = "FileExplorerViewSwitcher";

export const FileExplorerStatusBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-7 shrink-0 items-center justify-between gap-2 border-t bg-card px-3 text-2xs text-muted-foreground", className)} {...props} />
  )
);
FileExplorerStatusBar.displayName = "FileExplorerStatusBar";

/* ================================================================== */
/* Canvas + collapsible groups                                         */
/* ================================================================== */

export const FileExplorerCanvas = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto p-4", className)} {...props} />
  )
);
FileExplorerCanvas.displayName = "FileExplorerCanvas";

export interface FileExplorerGroupProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: string;
  items: FileItem[];
  defaultOpen?: boolean;
  /** Custom item renderer; defaults to <FileExplorerItem />. */
  renderItem?: (item: FileItem, scope: string[]) => React.ReactNode;
}

export const FileExplorerGroup = React.forwardRef<HTMLElement, FileExplorerGroupProps>(
  ({ title, items, defaultOpen = true, renderItem, className, ...props }, ref) => {
    const { view, query } = useFileExplorer();
    const q = query.trim().toLowerCase();
    const visible = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
    const scope = visible.map((i) => i.id);
    const headingId = React.useId();
    if (!visible.length) return null;

    return (
      <section ref={ref} aria-labelledby={headingId} className={className} {...props}>
        <Collapsible defaultOpen={defaultOpen}>
          <CollapsibleTrigger className="group/trigger mb-2 flex w-full items-center gap-1.5 rounded-sm text-left focus-ring">
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=closed]/trigger:-rotate-90" aria-hidden />
            <h3 id={headingId} className="text-xs font-semibold">{title}</h3>
            <span className="ml-auto text-2xs text-muted-foreground">{visible.length} {visible.length === 1 ? "item" : "items"}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div
              role="listbox"
              aria-multiselectable="true"
              aria-labelledby={headingId}
              className={cn(
                view === "grid" ? "grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-1"
              )}
            >
              {visible.map((item) => (renderItem ? renderItem(item, scope) : <FileExplorerItem key={item.id} item={item} scope={scope} />))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    );
  }
);
FileExplorerGroup.displayName = "FileExplorerGroup";

/* ================================================================== */
/* Item                                                                */
/* ================================================================== */

const KIND_ICON: Record<FileKind, LucideIcon> = {
  folder: Folder, zip: FileArchive, doc: FileText, pdf: FileText, sheet: FileSpreadsheet,
  image: FileImage, video: FileVideo, code: FileCode2, file: File,
};
/** Amber stays categorical: folders and archives only. */
const KIND_TONE: Partial<Record<FileKind, string>> = {
  folder: "bg-brand-accent-subtle text-brand-accent",
  zip: "bg-brand-accent-subtle text-brand-accent",
  sheet: "bg-success/10 text-success",
  image: "bg-special/10 text-special",
  pdf: "bg-destructive/10 text-destructive",
};

export interface FileExplorerItemProps extends React.HTMLAttributes<HTMLDivElement> {
  item: FileItem;
  scope: string[];
}

export const FileExplorerItem = React.forwardRef<HTMLDivElement, FileExplorerItemProps>(({ item, scope, className, ...props }, ref) => {
  const { view, selection, select, onOpenItem } = useFileExplorer();
  const selected = selection.has(item.id);
  const Icon = KIND_ICON[item.kind];
  const modified = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(item.modifiedAt));
  const detail = item.kind === "folder" ? item.meta ?? "Folder" : item.size !== undefined ? formatBytes(item.size) : item.meta;

  return (
    <div
      ref={ref}
      role="option"
      tabIndex={0}
      aria-selected={selected}
      draggable
      onDragStart={(e) => {
        const ids = selected ? [...selection] : [item.id];
        if (!selected) select(item.id);
        e.dataTransfer.setData(AGERE_ITEM_MIME, JSON.stringify(ids));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => select(item.id, { additive: e.metaKey || e.ctrlKey, range: e.shiftKey, scope })}
      onDoubleClick={() => onOpenItem?.(item.id)}
      onKeyDown={(e) => {
        if (e.key === " ") {
          e.preventDefault();
          select(item.id, { additive: true, range: e.shiftKey, scope });
        }
        if (e.key === "Enter") onOpenItem ? onOpenItem(item.id) : select(item.id);
      }}
      className={cn(
        "group/item relative cursor-default select-none rounded-lg border bg-card outline-none transition-[border-color,background-color,box-shadow] duration-fast",
        "hover:border-border-strong focus-ring",
        "aria-selected:border-brand aria-selected:bg-brand/[0.04] aria-selected:shadow-[0_0_0_1px_hsl(var(--ag-brand-default))]",
        view === "grid"
          ? "flex min-h-[104px] flex-col gap-2 p-3"
          : "grid min-h-[48px] grid-cols-[32px_minmax(0,1fr)] items-center gap-3 px-3 py-2 md:grid-cols-[32px_minmax(0,1fr)_140px_100px]",
        className
      )}
      {...props}
    >
      <span className={cn("grid size-8 place-items-center rounded-md bg-muted text-muted-foreground", KIND_TONE[item.kind])} aria-hidden>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">{item.name}</span>
        {view === "grid" && <span className="block truncate text-2xs text-muted-foreground">{[detail, modified].filter(Boolean).join(" • ")}</span>}
      </span>
      {view === "list" && (
        <>
          <span className="hidden truncate text-2xs text-muted-foreground md:block">{item.owner ?? "—"}</span>
          <span className="hidden text-right text-2xs tabular-nums text-muted-foreground md:block">{detail ?? modified}</span>
        </>
      )}
    </div>
  );
});
FileExplorerItem.displayName = "FileExplorerItem";
