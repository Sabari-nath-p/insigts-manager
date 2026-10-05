import { PmMemberRole } from '@prisma/client';

export type PmAction =
  | 'project.create'
  | 'project.edit'
  | 'project.archive'
  | 'project.delete'
  | 'task.create'
  | 'task.edit'
  | 'task.delete'
  | 'team.manage'
  | 'insights.workspace'
  | 'insights.members';

export interface PmActor {
  userId: string;
  role: PmMemberRole;
}

export interface PmResource {
  /** User id of whoever created the project / task being acted on. */
  createdBy?: string | null;
}

/**
 * Single permission map for the project-management area. `admin` can do everything; `staff`
 * gets the day-to-day actions plus the "own stuff" exceptions below. Every service method that
 * mutates or reads restricted data calls this — the UI hiding a button is never the only check.
 */
export function can(actor: PmActor, action: PmAction, resource?: PmResource): boolean {
  if (actor.role === 'admin') return true;
  const isOwn = !!resource?.createdBy && resource.createdBy === actor.userId;
  switch (action) {
    case 'project.create':
    case 'task.create':
    case 'task.edit':
      return true;
    case 'project.archive':
    case 'task.delete':
      return isOwn;
    case 'project.edit':
    case 'project.delete':
    case 'team.manage':
    case 'insights.workspace':
    case 'insights.members':
      return false;
  }
}
