import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

class TokenDto {
  /** Firebase Cloud Messaging registration token for this browser. */
  @IsString() @IsNotEmpty() @MaxLength(4096) token!: string;
}

/** Public: the Firebase web settings are designed to be shipped to every browser. */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsConfigController {
  constructor(private readonly push: PushService) {}

  @Get('config')
  config() {
    return { firebase: this.push.webConfig };
  }
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly push: PushService,
  ) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.notifications.list(user.userId);
  }

  @Post('read-all')
  readAll(@CurrentUser() user: { userId: string }) {
    return this.notifications.markRead(user.userId);
  }

  @Post('subscribe')
  async subscribe(@CurrentUser() user: { userId: string }, @Body() dto: TokenDto, @Headers('user-agent') ua?: string) {
    await this.push.subscribe(user.userId, dto.token, ua);
    return { ok: true };
  }

  @Post('unsubscribe')
  async unsubscribe(@CurrentUser() user: { userId: string }, @Body() dto: TokenDto) {
    await this.push.unsubscribe(user.userId, dto.token);
    return { ok: true };
  }

  /** Sends the caller a test alert so they can confirm alerts work on this device. */
  @Post('test')
  async test(@CurrentUser() user: { userId: string }) {
    const delivered = await this.push.send([user.userId], { title: 'Alerts are on', body: 'You will see updates like this one.', url: '/dashboard', tag: 'test' });
    return { delivered };
  }

  // Declared last so the static routes above win over the :id parameter.
  @Post(':id/read')
  readOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.notifications.markRead(user.userId, id);
  }
}
