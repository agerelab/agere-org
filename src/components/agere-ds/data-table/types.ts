import type { RowData } from "@tanstack/react-table";

export type EditorKind = "text" | "number" | "date" | "select";

export interface EditorOption {
  value: string;
  label: string;
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Enables inline editing for this column. */
    editor?: EditorKind;
    options?: EditorOption[];
    /** Accessible column name when the header is not plain text. */
    label?: string;
    align?: "left" | "right";
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData?: (rowId: string, columnId: string, value: unknown) => void;
  }
}

export {};
