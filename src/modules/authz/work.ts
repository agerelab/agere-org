// Work Ownership interface (PRD-03 §6.3): every app that has assignable work registers a provider.
// People counts open work before a removal and reassigns it inside the removal's transaction (R2).
import type { Db, Tx } from "@/db/client";

export type WorkProvider = {
  /** App id shown in the wizard ("space", or "access" for last-manager containers). */
  app: string;
  countOpenWork(q: Db | Tx, organizationId: string, userId: string): Promise<number>;
  /** Moves open work to `toUserId`; returns how many items moved. Runs in the caller's transaction. */
  reassignOpenWork(tx: Tx, organizationId: string, fromUserId: string, toUserId: string, bulkOperationId: string): Promise<number>;
  /** Items assigned to a team (PRD-03 §6.4: they become unassigned when the team is deleted). */
  countTeamWork?(q: Db | Tx, organizationId: string, teamId: string): Promise<number>;
  unassignTeam?(tx: Tx, organizationId: string, teamId: string): Promise<number>;
};

const PROVIDERS = new Map<string, WorkProvider>();

export function registerWorkProvider(p: WorkProvider) {
  PROVIDERS.set(p.app, p);
}

export function workProviders(): WorkProvider[] {
  return [...PROVIDERS.values()];
}

/** For tests. */
export function unregisterWorkProvider(app: string) {
  PROVIDERS.delete(app);
}
