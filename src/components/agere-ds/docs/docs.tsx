"use client";

import * as React from "react";
import {
  Bold, CheckSquare, ChevronRight, Code, Copy, FileText, Globe, Heading2, Italic, Link2, List, Lock, MoreHorizontal, Plus, Quote, Share2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkspaceMember } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { AssigneeStack } from "../workspace/task-fields";

/* ================================================================== */
/* DocTree — nested docs & folders (WAI-ARIA tree)                     */
/* ================================================================== */
export interface DocNode {
  id: string;
  title: string;
  /** Emoji or icon node. Defaults to a document glyph. */
  icon?: React.ReactNode;
  children?: DocNode[];
}

export interface DocTreeProps {
  nodes: DocNode[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAddChild?: (parentId: string) => void;
  defaultExpanded?: string[];
  label?: string;
  className?: string;
}

interface Flat { node: DocNode; level: number; parent?: string; hasChildren: boolean }

export function DocTree({ nodes, activeId, onSelect, onAddChild, defaultExpanded = [], label = "Docs", className }: DocTreeProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(defaultExpanded));
  const [focusId, setFocusId] = React.useState<string | undefined>(activeId ?? nodes[0]?.id);
  const refs = React.useRef(new Map<string, HTMLDivElement>());

  const visible: Flat[] = [];
  const walk = (list: DocNode[], level: number, parent?: string) =>
    list.forEach((n) => {
      const hasChildren = !!n.children?.length;
      visible.push({ node: n, level, parent, hasChildren });
      if (hasChildren && expanded.has(n.id)) walk(n.children!, level + 1, n.id);
    });
  walk(nodes, 1);

  const toggle = (id: string, open?: boolean) =>
    setExpanded((s) => { const n = new Set(s); (open ?? !n.has(id)) ? n.add(id) : n.delete(id); return n; });
  const move = (id?: string) => { if (!id) return; setFocusId(id); requestAnimationFrame(() => refs.current.get(id)?.focus()); };

  const onKey = (e: React.KeyboardEvent, f: Flat, i: number) => {
    const k = e.key;
    if (k === "ArrowDown") { e.preventDefault(); move(visible[i + 1]?.node.id); }
    else if (k === "ArrowUp") { e.preventDefault(); move(visible[i - 1]?.node.id); }
    else if (k === "Home") { e.preventDefault(); move(visible[0]?.node.id); }
    else if (k === "End") { e.preventDefault(); move(visible[visible.length - 1]?.node.id); }
    else if (k === "ArrowRight") { e.preventDefault(); if (f.hasChildren) { if (!expanded.has(f.node.id)) toggle(f.node.id, true); else move(f.node.children![0].id); } }
    else if (k === "ArrowLeft") { e.preventDefault(); if (f.hasChildren && expanded.has(f.node.id)) toggle(f.node.id, false); else move(f.parent); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); onSelect(f.node.id); }
  };

  return (
    <div role="tree" aria-label={label} className={cn("grid gap-px", className)}>
      {visible.map((f, i) => {
        const { node, level, hasChildren } = f;
        const open = expanded.has(node.id);
        const active = node.id === activeId;
        return (
          <div
            key={node.id}
            ref={(el) => { if (el) refs.current.set(node.id, el); else refs.current.delete(node.id); }}
            role="treeitem"
            aria-level={level}
            aria-expanded={hasChildren ? open : undefined}
            aria-selected={active}
            tabIndex={node.id === focusId ? 0 : -1}
            onKeyDown={(e) => onKey(e, f, i)}
            onFocus={() => setFocusId(node.id)}
            onClick={() => onSelect(node.id)}
            className={cn(
              "group/node flex h-8 cursor-default items-center gap-1 rounded-md pr-1 text-sm outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
              active ? "bg-emphasis font-medium text-emphasis" : "text-default hover:bg-subtle"
            )}
            style={{ paddingLeft: 4 + (level - 1) * 16 }}
          >
            <span
              aria-hidden
              onClick={(e) => { if (hasChildren) { e.stopPropagation(); toggle(node.id); } }}
              className={cn("grid size-5 shrink-0 place-items-center rounded-sm text-subtle", hasChildren && "hover:bg-emphasis")}
            >
              {hasChildren && <ChevronRight className={cn("size-3.5 transition-transform duration-base", open && "rotate-90")} />}
            </span>
            <span aria-hidden className="grid size-5 shrink-0 place-items-center text-subtle [&_svg]:size-4">{node.icon ?? <FileText />}</span>
            <span className="min-w-0 flex-1 truncate">{node.title}</span>
            {onAddChild && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Add page inside ${node.title}`}
                onClick={(e) => { e.stopPropagation(); onAddChild(node.id); toggle(node.id, true); }}
                className="grid size-6 place-items-center rounded-sm text-subtle opacity-0 hover:bg-emphasis group-hover/node:opacity-100"
              >
                <Plus aria-hidden className="size-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/* DocHeader — breadcrumb, editable title, presence, share             */
/* ================================================================== */
export interface DocHeaderProps {
  title: string;
  onTitleChange: (t: string) => void;
  breadcrumb?: string[];
  icon?: React.ReactNode;
  viewers?: WorkspaceMember[];
  lastEdited?: { by: string; at: string };
  shareUrl?: string;
  access?: "private" | "workspace" | "public";
  onAccessChange?: (a: "private" | "workspace" | "public") => void;
  actions?: React.ReactNode;
}

export function DocHeader({ title, onTitleChange, breadcrumb = [], icon, viewers = [], lastEdited, shareUrl = "https://agere.id/d/abc123", access = "workspace", onAccessChange, actions }: DocHeaderProps) {
  const inviteId = React.useId();
  return (
    <header className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-1 text-xs text-subtle">
              {breadcrumb.map((b, i) => (
                <li key={i} className="inline-flex min-w-0 items-center gap-1">
                  <span className={cn("truncate", i === breadcrumb.length - 1 && "text-emphasis")} aria-current={i === breadcrumb.length - 1 ? "page" : undefined}>{b}</span>
                  {i < breadcrumb.length - 1 && <ChevronRight aria-hidden className="size-3 shrink-0" />}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          {viewers.length > 0 && (
            <span className="flex items-center gap-2">
              <AssigneeStack members={viewers} max={4} size="sm" />
              <span className="hidden text-xs text-subtle sm:inline">{viewers.length} viewing</span>
            </span>
          )}
          <Popover>
            <PopoverTrigger asChild><Button size="sm" leadingIcon={<Share2 />}>Share</Button></PopoverTrigger>
            <PopoverContent align="end" className="grid w-80 gap-4 p-4">
              <div className="grid gap-1"><p className="type-heading-sm">Share this doc</p><p className="text-xs text-subtle">Anyone with access can view and comment.</p></div>
              <div className="flex gap-2">
                <Input size="md" aria-label={`Invite by email to ${title}`} placeholder="nama@perusahaan.com" id={inviteId} />
                <Button onClick={() => toast.success("Invitation sent")}>Invite</Button>
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-emphasis" id={`${inviteId}-a`}>General access</span>
                <Select value={access} onValueChange={(v) => onAccessChange?.(v as typeof access)}>
                  <SelectTrigger size="md" aria-labelledby={`${inviteId}-a`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Only invited people</SelectItem>
                    <SelectItem value="workspace">Everyone in workspace</SelectItem>
                    <SelectItem value="public">Anyone with the link</SelectItem>
                  </SelectContent>
                </Select>
                <p className="flex items-center gap-1.5 text-xs text-subtle">{access === "public" ? <Globe aria-hidden className="size-3.5" /> : <Lock aria-hidden className="size-3.5" />}{access === "public" ? "Public on the web" : access === "workspace" ? "Visible to agere members" : "Private"}</p>
              </div>
              <Button variant="outline" size="sm" leadingIcon={<Copy />} onClick={() => { navigator.clipboard?.writeText(shareUrl).catch(() => undefined); toast.success("Link copied"); }}>Copy link</Button>
            </PopoverContent>
          </Popover>
          {actions ?? <Button variant="ghost" size="icon-sm" aria-label="More document actions"><MoreHorizontal aria-hidden /></Button>}
        </div>
      </div>
      <div className="grid gap-1">
        {icon && <span aria-hidden className="text-4xl leading-none">{icon}</span>}
        <input
          aria-label="Document title"
          value={title}
          placeholder="Untitled"
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full rounded-md bg-transparent font-sans tracking-tight text-[32px] font-semibold leading-10 tracking-tight text-emphasis outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-focus/40"
        />
        {lastEdited && <p className="text-xs text-subtle">Last edited by {lastEdited.by} · {lastEdited.at}</p>}
      </div>
    </header>
  );
}

/* ================================================================== */
/* RichTextContainer — toolbar + prose surface for any editor          */
/* ================================================================== */
export interface RichTextContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Called with a command id; wire to Tiptap/Lexical (`editor.chain().toggleBold()`). */
  onCommand?: (cmd: "h2" | "bold" | "italic" | "bullet" | "check" | "quote" | "code" | "link") => void;
  toolbar?: boolean;
  children: React.ReactNode;
}

/** Provides the Agere prose styles + a formatting toolbar. Bring your own editor as children. */
export function RichTextContainer({ onCommand, toolbar = true, className, children, ...props }: RichTextContainerProps) {
  const tools: [Parameters<NonNullable<RichTextContainerProps["onCommand"]>>[0], string, React.ReactNode][] = [
    ["h2", "Heading", <Heading2 key="h" />], ["bold", "Bold", <Bold key="b" />], ["italic", "Italic", <Italic key="i" />],
    ["bullet", "Bulleted list", <List key="l" />], ["check", "Checklist", <CheckSquare key="c" />], ["quote", "Quote", <Quote key="q" />],
    ["code", "Code", <Code key="cd" />], ["link", "Link", <Link2 key="lk" />],
  ];
  return (
    <div className={cn("grid gap-2", className)} {...props}>
      {toolbar && (
        <div role="toolbar" aria-label="Text formatting" className="sticky top-0 z-sticky flex w-fit flex-wrap items-center gap-0.5 rounded-control border border-subtle bg-default/95 p-0.5 shadow-elevation-2 backdrop-blur-glass">
          {tools.map(([id, label, icon]) => (
            <button key={id} type="button" aria-label={label} title={label} onMouseDown={(e) => e.preventDefault()} onClick={() => onCommand?.(id)} className="inline-flex size-7 items-center justify-center rounded-lg text-subtle hover:bg-subtle hover:text-emphasis focus-ring [&_svg]:size-4">
              {icon}
            </button>
          ))}
        </div>
      )}
      <div
        className={cn(
          "max-w-prose text-[15px] leading-7 text-default",
          "[&_h2]:mt-6 [&_h2]:type-heading-lg [&_h2]:text-emphasis [&_h3]:mt-4 [&_h3]:type-heading-md [&_p]:mt-3",
          "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1",
          "[&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-brand-accent [&_blockquote]:pl-4 [&_blockquote]:text-subtle",
          "[&_code]:rounded-sm [&_code]:bg-subtle [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.88em] [&_a]:font-medium [&_a]:text-emphasis [&_a]:underline",
          "[&_[contenteditable]]:outline-none [&_[contenteditable]:focus-visible]:ring-2 [&_[contenteditable]:focus-visible]:ring-focus/30 [&_[contenteditable]]:rounded-md"
        )}
      >
        {children}
      </div>
    </div>
  );
}
