import { Global, Module } from '@nestjs/common';
import { NotificationsConfigController, NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

/**
 * Global so attendance, users and projects can raise notifications without importing this module
 * (and without a circular dependency, since this module imports none of them).
 */
@Global()
@Module({
  controllers: [NotificationsConfigController, NotificationsController],
  providers: [NotificationsService, PushService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
