import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PmAccessService } from './pm-access.service';

/** Runs after JwtAuthGuard: resolves the user's PM role (or 403s when revoked) onto the request. */
@Injectable()
export class PmAccessGuard implements CanActivate {
  constructor(private readonly access: PmAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    req.pmActor = await this.access.requireActor(req.user.userId, req.user.role);
    return true;
  }
}
