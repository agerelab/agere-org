// Loads every module that registers a Work Ownership provider or an event consumer, so flows that
// rely on the registries (member removal, team deletion, dispatch) see all of them in any route.
import "@/modules/authz/service";
import "@/modules/space/work";
