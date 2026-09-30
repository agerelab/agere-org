"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DataTable, DataTableColumnHeader, DataTableContent, DataTableFacetedFilter, DataTablePagination, DataTableSearch, DataTableToolbar,
} from "../data-table";

/* ================================================================== */
/* Money helpers                                                       */
/* ================================================================== */
export function formatMoney(amount: number, currency = "IDR", locale = "id-ID", compact = false) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" || currency === "JPY" ? 0 : 2,
    notation: compact ? "compact" : "standard",
  }).format(amount);
}

/* ================================================================== */
/* FinancialMetricCard                                                 */
/* ================================================================== */
export interface FinancialMetricCardProps {
  label: string;
  amount: number;
  currency?: string;
  /** Percent change vs comparison period. */
  delta?: number;
  /** Is an increase good? Balance/revenue yes; cost/expense no. */
  positiveIsGood?: boolean;
  comparison?: string;
  /** Recent values for the sparkline (oldest → newest). */
  trend?: number[];
  kind?: "balance" | "income" | "expense" | "invoice";
  footer?: React.ReactNode;
  className?: string;
}

function Sparkline({ values, tone }: { values: number[]; tone: "good" | "bad" | "neutral" }) {
  const w = 120, h = 36, p = 2;
  const min = Math.min(...values), max = Math.max(...values);
  const x = (i: number) => p + (i * (w - p * 2)) / (values.length - 1);
  const y = (v: number) => h - p - ((v - min) / (max - min || 1)) * (h - p * 2);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const color = tone === "good" ? "hsl(var(--ag-success-icon))" : tone === "bad" ? "hsl(var(--ag-error-icon))" : "hsl(var(--ag-fg-subtle))";
  const id = React.useId();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className="shrink-0 overflow-visible">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.18" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${x(values.length - 1)} ${h} L${x(0)} ${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}

const KIND_LABEL = { balance: "Balance", income: "Income", expense: "Expense", invoice: "Invoices" } as const;

/** KPI tile for balance, cost/expense and invoicing — trend color follows meaning, not sign. */
export function FinancialMetricCard({ label, amount, currency = "IDR", delta, positiveIsGood = true, comparison = "vs last month", trend, kind, footer, className }: FinancialMetricCardProps) {
  const up = (delta ?? 0) >= 0;
  const good = up === positiveIsGood;
  return (
    <Card className={cn("gap-3 p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-subtle">{label}</p>
        {kind && <Badge size="sm" variant="gray">{KIND_LABEL[kind]}</Badge>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="min-w-0 truncate font-sans tracking-tight text-[28px] font-semibold leading-9 tracking-tight text-emphasis tabular-nums" title={formatMoney(amount, currency)}>
          {formatMoney(amount, currency, "id-ID", Math.abs(amount) >= 1e9)}
        </p>
        {trend && trend.length > 1 && <Sparkline values={trend} tone={delta === undefined ? "neutral" : good ? "good" : "bad"} />}
      </div>
      {delta !== undefined && (
        <p className="flex items-center gap-1.5 text-xs text-subtle">
          <Badge variant={good ? "success" : "error"} size="sm" startIcon={up ? <TrendingUp /> : <TrendingDown />}>
            <span className="sr-only">{up ? "Up" : "Down"} </span>{Math.abs(delta).toFixed(1)}%
          </Badge>
          {comparison}
        </p>
      )}
      {footer && <div className="border-t border-subtle pt-3 text-xs text-subtle">{footer}</div>}
    </Card>
  );
}

/* ================================================================== */
/* TransactionTable — multi-currency                                   */
/* ================================================================== */
export type TransactionStatus = "paid" | "pending" | "failed" | "refunded";
export interface Transaction {
  id: string;
  /** ISO date */
  date: string;
  description: string;
  counterparty?: string;
  category: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  /** Amount converted to the reporting currency. */
  amountBase?: number;
  status: TransactionStatus;
}

const TX_STATUS: Record<TransactionStatus, { label: string; variant: "success" | "attention" | "error" | "gray" }> = {
  paid: { label: "Paid", variant: "success" }, pending: { label: "Pending", variant: "attention" },
  failed: { label: "Failed", variant: "error" }, refunded: { label: "Refunded", variant: "gray" },
};

export interface TransactionTableProps {
  transactions: Transaction[];
  /** Reporting currency for the converted column. */
  baseCurrency?: string;
  pageSize?: number;
  className?: string;
  onRowClick?: (t: Transaction) => void;
}

export function TransactionTable({ transactions, baseCurrency = "IDR", pageSize = 8, className, onRowClick }: TransactionTableProps) {
  const categories = Array.from(new Set(transactions.map((t) => t.category)));
  const columns = React.useMemo<ColumnDef<Transaction, any>[]>(() => [
    {
      accessorKey: "date", size: 120, meta: { label: "Date" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ getValue }) => <span className="tabular-nums">{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(getValue()))}</span>,
    },
    {
      accessorKey: "description", size: 260, meta: { label: "Description" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-full", row.original.type === "income" ? "bg-success-bg text-success-fg" : "bg-subtle text-subtle")}>
            {row.original.type === "income" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
          </span>
          <span className="grid min-w-0"><span className="truncate font-medium text-emphasis">{row.original.description}</span>{row.original.counterparty && <span className="truncate text-xs text-subtle">{row.original.counterparty}</span>}</span>
        </span>
      ),
    },
    { accessorKey: "category", size: 130, filterFn: "arrIncludesSome", meta: { label: "Category" }, header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />, cell: ({ getValue }) => <Badge variant="gray" size="sm">{getValue()}</Badge> },
    {
      accessorKey: "status", size: 120, filterFn: "arrIncludesSome", meta: { label: "Status" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ getValue }) => { const s = TX_STATUS[getValue() as TransactionStatus]; return <Badge variant={s.variant} dot>{s.label}</Badge>; },
    },
    {
      id: "amount", accessorFn: (t) => (t.type === "expense" ? -1 : 1) * t.amount, size: 150, meta: { label: "Amount", align: "right" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" className="ml-auto" />,
      cell: ({ row }) => {
        const t = row.original;
        return (
          <span className={cn("font-medium tabular-nums", t.type === "income" ? "text-success-on-surface" : "text-emphasis")}>
            <span aria-hidden>{t.type === "income" ? "+" : "−"}</span>
            <span className="sr-only">{t.type === "income" ? "Income " : "Expense "}</span>
            {formatMoney(t.amount, t.currency)}
          </span>
        );
      },
    },
    {
      id: "base", accessorFn: (t) => (t.type === "expense" ? -1 : 1) * (t.amountBase ?? t.amount), size: 150, meta: { label: `Amount (${baseCurrency})`, align: "right" },
      header: ({ column }) => <DataTableColumnHeader column={column} title={baseCurrency} className="ml-auto" />,
      cell: ({ row }) => {
        const t = row.original;
        if (t.currency === baseCurrency) return <span className="text-muted">—</span>;
        return <span className="tabular-nums text-subtle">≈ {formatMoney(t.amountBase ?? t.amount, baseCurrency)}</span>;
      },
    },
  ], [baseCurrency]);

  return (
    <DataTable columns={columns} data={transactions} getRowId={(t) => t.id} enableRowSelection={false} pagination={{ pageSize }} className={className}>
      <DataTableToolbar>
        <DataTableSearch placeholder="Search transactions" />
        <DataTableFacetedFilter columnId="status" title="Status" options={(Object.keys(TX_STATUS) as TransactionStatus[]).map((s) => ({ value: s, label: TX_STATUS[s].label }))} />
        <DataTableFacetedFilter columnId="category" title="Category" options={categories.map((c) => ({ value: c, label: c }))} />
      </DataTableToolbar>
      <DataTableContent caption="Transactions" onRowClick={onRowClick ? (r) => onRowClick(r.original) : undefined} />
      <DataTablePagination pageSizeOptions={[8, 20, 50]} />
    </DataTable>
  );
}
