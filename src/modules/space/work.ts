// Work Ownership provider (PRD-03 §6.3): open tasks assigned to a person or a team.
import { publish } from "@/modules/events";
import { registerWorkProvider } from "@/modules/authz/work";
import * as repo from "./repository";

registerWorkProvider({
  app: "space",
  async countOpenWork(q, organizationId, userId) {
    return (await repo.openTasksAssignedTo(q, organizationId, "user", [userId])).length;
  },
  /** R5: each reassigned task publishes space.task.assigned with the shared bulk_operation_id. */
  async reassignOpenWork(tx, organizationId, fromUserId, toUserId, bulkOperationId) {
    const moved = await repo.reassignOpen(tx, organizationId, "user", fromUserId, { type: "user", id: toUserId });
    for (const r of moved)
      await publish(
        tx,
        { scope: "organization", organizationId, actor: { type: "system" } },
        {
          type: "space.task.assigned",
          subject: { module: "space", type: "task", id: r.task.id, container: { type: "project", id: r.task.projectId } },
          data: { assignee_type: "user", assignee_id: toUserId, project_id: r.task.projectId },
          bulkOperationId,
        },
      );
    return moved.length;
  },
  async countTeamWork(q, organizationId, teamId) {
    return (await repo.openTasksAssignedTo(q, organizationId, "team", [teamId])).length;
  },
  /** PRD-03 §6.4: a deleted team's open items become unassigned. */
  async unassignTeam(tx, organizationId, teamId) {
    return (await repo.reassignOpen(tx, organizationId, "team", teamId, null)).length;
  },
});
