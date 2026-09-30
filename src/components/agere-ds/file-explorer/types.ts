export type FileKind = "folder" | "file" | "doc" | "sheet" | "image" | "video" | "zip" | "code" | "pdf";

export interface FileItem {
  id: string;
  name: string;
  kind: FileKind;
  /** Bytes. Omit for folders. */
  size?: number;
  /** ISO 8601 timestamp. */
  modifiedAt: string;
  owner?: string;
  /** e.g. item count for folders. */
  meta?: string;
}

export interface FileTreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: FileTreeNode[];
  /** Accepts dropped items / files. */
  droppable?: boolean;
}

export type FileExplorerView = "grid" | "list";

export type UploadStatus = "queued" | "uploading" | "success" | "error";

export interface UploadTask {
  id: string;
  name: string;
  size: number;
  /** 0–100 */
  progress: number;
  status: UploadStatus;
  error?: string;
}

export interface FileGroup {
  id: string;
  title: string;
  items: FileItem[];
}
