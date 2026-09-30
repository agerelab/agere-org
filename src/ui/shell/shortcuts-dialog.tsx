"use client";

// Pintasan keyboard (UI-01 v2.4, Ctrl /): the shortcuts the shell and Space support today.
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MessageKey, translator } from "@/i18n";

const ROWS: { keys: string[]; label: MessageKey }[] = [
  { keys: ["Ctrl", "/"], label: "shortcuts.open" },
  { keys: ["Ctrl", "B"], label: "shortcuts.panel" },
  { keys: ["Alt", "1…2"], label: "shortcuts.rail" },
  { keys: ["Space"], label: "shortcuts.moveCard" },
  { keys: ["←", "→"], label: "shortcuts.tabs" },
  { keys: ["@"], label: "shortcuts.mention" },
  { keys: ["Esc"], label: "shortcuts.close" },
];

export function ShortcutsDialog({ t, open, onOpenChange }: { t: ReturnType<typeof translator>; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <dl className="grid gap-2 text-sm">
            {ROWS.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4">
                <dt className="text-default">{t(r.label)}</dt>
                <dd className="flex gap-1">
                  {r.keys.map((k) => (
                    <kbd key={k} className="rounded border border-default bg-subtle px-1.5 py-0.5 font-mono text-xs text-emphasis">{k}</kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
