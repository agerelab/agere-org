"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export const VIEWS = ["daftar", "papan"] as const;
export type ProjectView = (typeof VIEWS)[number];
const key = (projectId: string) => `agere:ptab:${projectId}`;

/** Remembers the view per project on this device (localStorage, may be unavailable). */
export function rememberView(projectId: string, view: ProjectView) {
  try {
    localStorage.setItem(key(projectId), view);
  } catch {}
}

export function ProjectLanding({ base, projectId }: { base: string; projectId: string }) {
  const router = useRouter();
  React.useEffect(() => {
    let view: string | null = null;
    try {
      view = localStorage.getItem(key(projectId));
    } catch {}
    router.replace(`${base}/${VIEWS.includes(view as ProjectView) ? view : "papan"}`);
  }, [base, projectId, router]);
  return null;
}
