/** Date helpers working on local-time `YYYY-MM-DD` keys (no timezone drift). */
export type DateKey = string;

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(value: DateKey): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function diffInDays(a: DateKey, b: DateKey): number {
  const ms = parseDateKey(b).getTime() - parseDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function shiftDateKey(key: DateKey, days: number): DateKey {
  return toDateKey(addDays(parseDateKey(key), days));
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function startOfGrid(month: Date, weekStartsOn: 0 | 1): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  return addDays(first, -offset);
}

export function isOverdue(dueDate?: DateKey): boolean {
  if (!dueDate) return false;
  return dueDate < toDateKey(new Date());
}

export function formatShortDate(value?: DateKey, locale = "en-US"): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(parseDateKey(value));
}
