import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

class SubscriptionKeysDto {
  @IsString() @IsNotEmpty() @MaxLength(200) p256dh!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) auth!: string;
}

class SubscribeDto {
  /** Push services are always https, so anything else is not a real subscription. */
  @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2000) endpoint!: string;
  @IsDefined() @ValidateNested() @Type(() => SubscriptionKeysDto) keys!: SubscriptionKeysDto;
}

class UnsubscribeDto {
  @IsString() @IsNotEmpty() endpoint!: string;
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

  @Get('config')
  config() {
    return { publicKey: this.push.publicKey };
  }

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.notifications.list(user.userId);
  }

  @Post('read-all')
  readAll(@CurrentUser() user: { userId: string }) {
    return this.notifications.markRead(user.userId);
  }

  @Post(':id/read')
  readOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.notifications.markRead(user.userId, id);
  }

  @Post('subscribe')
  async subscribe(@CurrentUser() user: { userId: string }, @Body() dto: SubscribeDto, @Headers('user-agent') ua?: string) {
    await this.push.subscribe(user.userId, dto, ua);
    return { ok: true };
  }

  @Post('unsubscribe')
  async unsubscribe(@CurrentUser() user: { userId: string }, @Body() dto: UnsubscribeDto) {
    await this.push.unsubscribe(user.userId, dto.endpoint);
    return { ok: true };
  }

  /** Sends the caller a test push so they can confirm alerts work on this device. */
  @Post('test')
  async test(@CurrentUser() user: { userId: string }) {
    const delivered = await this.push.send([user.userId], { title: 'Alerts are on', body: 'You will see updates like this one.', url: '/dashboard', tag: 'test' });
    return { delivered };
  }

}
