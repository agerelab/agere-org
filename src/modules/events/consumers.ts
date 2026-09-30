// Consumer registry (PRD-00b §7). A consumer is idempotent on (event_id, consumer) (D5) and may
// be marked non-replayable (D13). Modules register their consumer here when they ship.
import type { StoredEvent } from "./repository";

export type Consumer = { name: string; replayable: boolean; handle: (event: StoredEvent) => Promise<void> };

const REGISTRY = new Map<string, Consumer>();

export function registerConsumer(c: Consumer) {
  REGISTRY.set(c.name, c);
}

export function getConsumer(name: string): Consumer | undefined {
  return REGISTRY.get(name);
}

/** For tests. */
export function clearConsumers() {
  REGISTRY.clear();
}
