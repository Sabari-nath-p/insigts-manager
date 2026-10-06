import { ForbiddenException, Injectable } from '@nestjs/common';
import { PmMemberRole, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PmAction, PmActor, PmResource, can } from './pm-permissions';

@Injectable()
export class PmAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Effective project-management role for a logged-in user: an explicit `pm_members` row wins
   * (admin / staff / revoked); otherwise super admins are admins and everyone else is staff.
   * Returns null when access is revoked or the account is inactive.
   */
  async resolve(userId: string, appRole: UserRole): Promise<PmActor | null> {
    const [user, member] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } }),
      this.prisma.pmMember.findUnique({ where: { userId } }),
    ]);
    if (!user?.isActive || member?.revoked) return null;
    const role: PmMemberRole = member?.role ?? (appRole === UserRole.super_admin ? 'admin' : 'staff');
    return { userId, role };
  }

  async requireActor(userId: string, appRole: UserRole): Promise<PmActor> {
    const actor = await this.resolve(userId, appRole);
    if (!actor) throw new ForbiddenException('You do not have access to project management');
    return actor;
  }

  can(actor: PmActor, action: PmAction, resource?: PmResource): boolean {
    return can(actor, action, resource);
  }

  assert(actor: PmActor, action: PmAction, resource?: PmResource): void {
    if (!can(actor, action, resource)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
  }
}
