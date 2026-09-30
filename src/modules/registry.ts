// Loads every module that registers a Work Ownership provider or an event consumer, so flows that
// rely on the registries (member removal, team deletion, publish and dispatch) see all of them in any
// route. Loaded at server start by src/instrumentation.ts.
import "@/modules/authz/service";
import "@/modules/space/work";
import "@/modules/notifications";
