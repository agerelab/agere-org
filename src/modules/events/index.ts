// Public interface of the events module (TECH-01 §3). Other modules import only from here.
import { after } from "next/server";
import { dispatch } from "./dispatch";

export { publish, PublishError, type Actor, type PublishContext, type PublishInput, type Subject } from "./publish";
export { dispatch, sweep, MAX_ATTEMPTS } from "./dispatch";
export { registerConsumer, type Consumer } from "./consumers";
export type { EventType } from "./catalog";

/** Call after the transaction commits: delivers the events once the response is sent (D3). */
export function dispatchAfterResponse(eventIds: string[]) {
  if (!eventIds.length) return;
  after(async () => {
    for (const id of eventIds) await dispatch(id).catch((e) => console.error("[events] dispatch", e));
  });
}
