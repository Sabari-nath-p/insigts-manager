import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PmActor } from './pm-permissions';

/** The resolved project-management actor, attached by PmAccessGuard. */
export const PmUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): PmActor => {
  return ctx.switchToHttp().getRequest().pmActor;
});
