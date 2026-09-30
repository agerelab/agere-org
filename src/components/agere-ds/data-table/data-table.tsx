"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type Header,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, ListFilter, SearchX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Pagination, PaginationSummary } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import "./types";

/* ================================================================== */
/* Context                                                             */
/* ================================================================== */

const DataTableContext = React.createContext<Table<any> | null>(null);

export function useDataTable<TData>(): Table<TData> {
  const table = React.useContext(DataTableContext);
  if (!table) throw new Error("DataTable parts must be rendered inside <DataTable>.");
  return table as Table<TData>;
}

/* ================================================================== */
/* <DataTable> root                                                    */
/* ================================================================== */

export interface DataTableProps<TData> extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  getRowId: (row: TData) => string;
  /** Inline edit commit. Persist, then pass the new `data` back. */
  onCellEdit?: (rowId: string, columnId: string, value: unknown) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  enableRowSelection?: boolean;
  onRowClick?: (row: Row<TData>) => void;
  /** Client-side pagination. `true` = 10 rows/page. Render <DataTablePagination /> in the footer. */
  pagination?: boolean | { pageSize: number };
  /** Controlled global text filter (pair with <DataTableSearch />). */
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  children?: React.ReactNode;
}

function DataTableInner<TData>(
  {
    columns, data, getRowId, onCellEdit,
    rowSelection: rowSelectionProp, onRowSelectionChange,
    sorting: sortingProp, onSortingChange,
    enableRowSelection = true, onRowClick,
    pagination, globalFilter: globalFilterProp, onGlobalFilterChange,
    columnFilters: columnFiltersProp, onColumnFiltersChange,
    className, children, ...props
  }: DataTableProps<TData>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const [innerSelection, setInnerSelection] = React.useState<RowSelectionState>({});
  const [innerSorting, setInnerSorting] = React.useState<SortingState>([]);
  const [innerFilter, setInnerFilter] = React.useState("");
  const [innerColumnFilters, setInnerColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [paging, setPaging] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: typeof pagination === "object" ? pagination.pageSize : 10,
  });

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      rowSelection: rowSelectionProp ?? innerSelection,
      sorting: sortingProp ?? innerSorting,
      globalFilter: globalFilterProp ?? innerFilter,
      columnFilters: columnFiltersProp ?? innerColumnFilters,
      ...(pagination ? { pagination: paging } : {}),
    },
    enableRowSelection,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: { size: 180, minSize: 64, maxSize: 640 },
    onRowSelectionChange: onRowSelectionChange ?? setInnerSelection,
    onSortingChange: onSortingChange ?? setInnerSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onGlobalFilterChange: onGlobalFilterChange ?? setInnerFilter,
    onColumnFiltersChange: onColumnFiltersChange ?? setInnerColumnFilters,
    globalFilterFn: "includesString",
    ...(pagination ? { getPaginationRowModel: getPaginationRowModel(), onPaginationChange: setPaging, autoResetPageIndex: true } : {}),
    meta: { updateData: onCellEdit },
  });

  return (
    <DataTableContext.Provider value={table}>
      <div
        ref={ref}
        data-agere-component="data-table"
        data-row-click={onRowClick ? "" : undefined}
        className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-subtle bg-default text-default shadow-elevation-1", className)}
        {...props}
      >
        {children ?? <DataTableContent onRowClick={onRowClick} />}
      </div>
    </DataTableContext.Provider>
  );
}

export const DataTable = React.forwardRef(DataTableInner) as <TData>(
  props: DataTableProps<TData> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => ReturnType<typeof DataTableInner>;
(DataTable as { displayName?: string }).displayName = "DataTable";

/* ================================================================== */
/* Toolbar (selection-aware)                                           */
/* ================================================================== */

export interface DataTableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shown instead of `children` while rows are selected. */
  selectionActions?: (selectedIds: string[]) => React.ReactNode;
}

export const DataTableToolbar = React.forwardRef<HTMLDivElement, DataTableToolbarProps>(
  ({ selectionActions, className, children, ...props }, ref) => {
    const table = useDataTable();
    const selected = table.getSelectedRowModel().rows.map((r) => r.id);
    return (
      <div ref={ref} className={cn("flex min-h-14 flex-wrap items-center gap-2 border-b border-subtle bg-default px-4 py-2.5", className)} {...props}>
        {selected.length > 0 && selectionActions ? (
          <>
            <span className="text-sm font-medium text-emphasis" aria-live="polite">{selected.length} selected</span>
            {selectionActions(selected)}
          </>
        ) : (
          children
        )}
      </div>
    );
  }
);
DataTableToolbar.displayName = "DataTableToolbar";

/* ================================================================== */
/* Content — sticky header, resizable columns                          */
/* ================================================================== */

export interface DataTableContentProps<TData> extends React.HTMLAttributes<HTMLDivElement> {
  onRowClick?: (row: Row<TData>) => void;
  emptyState?: React.ReactNode;
  caption?: string;
}

export const DataTableContent = React.forwardRef<HTMLDivElement, DataTableContentProps<any>>(
  ({ onRowClick, emptyState, caption, className, ...props }, ref) => {
    const table = useDataTable<any>();
    const rows = table.getRowModel().rows;

    return (
      <div ref={ref} className={cn("relative min-h-0 flex-1 overflow-auto", className)} {...props}>
        <table className="border-separate border-spacing-0 text-sm" style={{ width: table.getTotalSize(), minWidth: "100%" }}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <HeaderCell key={header.id} header={header} />
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  aria-selected={table.options.enableRowSelection ? row.getIsSelected() : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "group/row transition-colors duration-fast hover:bg-muted",
                    "data-[state=selected]:bg-brand/[0.05]",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={cn(
                        "h-11 max-w-0 truncate border-b border-r border-subtle px-3 align-middle text-default last:border-r-0",
                        cell.column.columnDef.meta?.align === "right" && "text-right tabular-nums"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className="p-6">
                  {emptyState ?? (
                    <EmptyState
                      variant="plain"
                      size="sm"
                      icon={<SearchX />}
                      title="No results"
                      description="No rows match this view. Try a different search or clear the filters."
                      actions={
                        table.getState().globalFilter || table.getState().columnFilters.length ? (
                          <Button variant="outline" size="sm" onClick={() => { table.setGlobalFilter(""); table.resetColumnFilters(); }}>
                            Clear filters
                          </Button>
                        ) : undefined
                      }
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
);
DataTableContent.displayName = "DataTableContent";

function HeaderCell<TData>({ header }: { header: Header<TData, unknown> }) {
  const { column } = header;
  const sorted = column.getIsSorted();
  const label = column.columnDef.meta?.label ?? (typeof column.columnDef.header === "string" ? column.columnDef.header : column.id);

  return (
    <th
      scope="col"
      colSpan={header.colSpan}
      style={{ width: header.getSize() }}
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : column.getCanSort() ? "none" : undefined}
      className="relative h-10 border-b border-r border-subtle bg-muted px-3 text-left text-xs font-medium uppercase tracking-wide text-subtle last:border-r-0"
    >
      {header.isPlaceholder ? null : flexRender(column.columnDef.header, header.getContext())}
      {column.getCanResize() && <ColumnResizer header={header} label={label} />}
    </th>
  );
}

/** Pointer drag + keyboard (←/→, Shift for 32px) resize handle. */
function ColumnResizer<TData>({ header, label }: { header: Header<TData, unknown>; label: string }) {
  const table = useDataTable<TData>();
  const { column } = header;
  const nudge = (delta: number) =>
    table.setColumnSizing((prev) => ({ ...prev, [column.id]: Math.max(column.columnDef.minSize ?? 64, column.getSize() + delta) }));

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      aria-valuenow={column.getSize()}
      aria-valuemin={column.columnDef.minSize}
      aria-valuemax={column.columnDef.maxSize}
      tabIndex={0}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDoubleClick={() => column.resetSize()}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); nudge(e.shiftKey ? -32 : -8); }
        if (e.key === "ArrowRight") { e.preventDefault(); nudge(e.shiftKey ? 32 : 8); }
      }}
      className={cn(
        "absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none",
        "after:absolute after:inset-y-2 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent",
        "hover:after:bg-brand focus-visible:outline-none focus-visible:after:bg-brand",
        column.getIsResizing() && "after:bg-brand"
      )}
    />
  );
}

/* ================================================================== */
/* Column header with sort                                             */
/* ================================================================== */

export interface DataTableColumnHeaderProps<TData, TValue> extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  column: Column<TData, TValue>;
  title: string;
}

function DataTableColumnHeaderInner<TData, TValue>(
  { column, title, className, ...props }: DataTableColumnHeaderProps<TData, TValue>,
  ref: React.ForwardedRef<HTMLButtonElement>
) {
  if (!column.getCanSort()) return <span className={className}>{title}</span>;
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <button
      ref={ref}
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        "-mx-1 inline-flex h-7 max-w-full items-center gap-1 rounded-sm px-1 hover:text-foreground focus-ring",
        sorted && "text-foreground",
        className
      )}
      {...props}
    >
      <span className="truncate">{title}</span>
      <Icon className={cn("size-3 shrink-0", !sorted && "opacity-50")} aria-hidden />
    </button>
  );
}

/** Sortable header button (aria-sort is set on the parent <th>). */
export const DataTableColumnHeader = React.forwardRef(DataTableColumnHeaderInner) as <TData, TValue>(
  props: DataTableColumnHeaderProps<TData, TValue> & { ref?: React.ForwardedRef<HTMLButtonElement> }
) => ReturnType<typeof DataTableColumnHeaderInner>;

/* ================================================================== */
/* Selection column factory                                            */
/* ================================================================== */

export function createSelectColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: "__select",
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableSorting: false,
    enableResizing: false,
    meta: { label: "Select" },
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows"
        checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
        onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
      />
    ),
  };
}

/* ================================================================== */
/* Search · Faceted filter · Pagination footer                         */
/* ================================================================== */

export function DataTableSearch({ placeholder = "Search…", label = "Search rows", className }: { placeholder?: string; label?: string; className?: string }) {
  const table = useDataTable();
  const value = (table.getState().globalFilter as string) ?? "";
  return (
    <div className={cn("w-full sm:w-64", className)}>
      <SearchInput
        size="md"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
        onClear={() => table.setGlobalFilter("")}
      />
    </div>
  );
}

export interface DataTableFacetedFilterProps {
  columnId: string;
  title: string;
  options: { value: string; label: string; icon?: React.ReactNode }[];
}

/** Multi-select column filter (cal.com "Filter" chip). Uses the column's `filterFn: "arrIncludesSome"`. */
export function DataTableFacetedFilter({ columnId, title, options }: DataTableFacetedFilterProps) {
  const table = useDataTable();
  const column = table.getColumn(columnId);
  const selected = new Set((column?.getFilterValue() as string[] | undefined) ?? []);
  const facets = column?.getFacetedUniqueValues();
  if (!column) return null;
  const toggle = (v: string) => {
    const next = new Set(selected);
    next.has(v) ? next.delete(v) : next.add(v);
    column.setFilterValue(next.size ? Array.from(next) : undefined);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="md" leadingIcon={<ListFilter />} aria-label={`Filter by ${title}${selected.size ? `, ${selected.size} selected` : ""}`}>
          {title}
          {selected.size > 0 && <Badge variant="gray" size="sm" rounded>{selected.size}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <ul role="listbox" aria-multiselectable aria-label={title} className="grid gap-0.5">
          {options.map((o) => {
            const on = selected.has(o.value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={on}
                tabIndex={0}
                onClick={() => toggle(o.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(o.value); } }}
                className="flex h-8 cursor-default items-center gap-2 rounded-lg px-2 text-sm text-default hover:bg-subtle focus-ring-inset"
              >
                <span aria-hidden className={cn("grid size-4 place-items-center rounded-sm border", on ? "border-brand bg-brand text-brand-fg" : "border-control")}>
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
                {o.icon}
                <span className="flex-1">{o.label}</span>
                <span className="text-xs text-subtle tabular-nums">{facets?.get(o.value) ?? 0}</span>
              </li>
            );
          })}
        </ul>
        {selected.size > 0 && (
          <Button variant="ghost" size="sm" fullWidth className="mt-1" onClick={() => column.setFilterValue(undefined)}>
            Clear filter
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Footer with "1–10 of 97", rows-per-page, and numbered pagination. Requires `pagination` on <DataTable>. */
export function DataTablePagination({ pageSizeOptions = [10, 25, 50], className }: { pageSizeOptions?: number[]; className?: string }) {
  const table = useDataTable();
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(1, table.getPageCount());
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-subtle bg-default px-4 py-2.5", className)}>
      <PaginationSummary
        page={pageIndex + 1}
        pageSize={pageSize}
        total={total}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={(n) => table.setPageSize(n)}
      />
      <Pagination page={pageIndex + 1} pageCount={pageCount} onPageChange={(p) => table.setPageIndex(p - 1)} />
    </div>
  );
}
