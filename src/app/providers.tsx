"use client";

import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

/** The only client boundary at the root. Toasts sit bottom-left (UI-01 "Toast & simpan"). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      {children}
      <Toaster position="bottom-left" />
    </TooltipProvider>
  );
}
