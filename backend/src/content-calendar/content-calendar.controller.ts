import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CalendarUser, ContentCalendarService } from './content-calendar.service';
import { CreateCalendarDto, SaveDayDto, SetEditorDto, UpdateCalendarDto } from './dto/content-calendar.dto';

/** Everything under /content-calendar. Viewing is open to any logged-in user; editing is checked in the service. */
@ApiTags('content-calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('content-calendar')
export class ContentCalendarController {
  constructor(private readonly service: ContentCalendarService) {}

  @Get('me')
  me(@CurrentUser() user: CalendarUser) {
    return this.service.me(user);
  }

  @Get('calendars')
  list() {
    return this.service.list();
  }

  @Post('calendars')
  create(@CurrentUser() user: CalendarUser, @Body() dto: CreateCalendarDto) {
    return this.service.create(user, dto);
  }

  @Patch('calendars/:id')
  update(@CurrentUser() user: CalendarUser, @Param('id') id: string, @Body() dto: UpdateCalendarDto) {
    return this.service.update(user, id, dto);
  }

  @Delete('calendars/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: CalendarUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Put('calendars/:id/days/:day')
  @HttpCode(204)
  saveDay(@CurrentUser() user: CalendarUser, @Param('id') id: string, @Param('day', ParseIntPipe) day: number, @Body() dto: SaveDayDto) {
    return this.service.saveDay(user, id, day, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('access')
  listAccess() {
    return this.service.listAccess();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Put('access/:userId')
  @HttpCode(204)
  setEditor(@Param('userId') userId: string, @Body() dto: SetEditorDto) {
    return this.service.setEditor(userId, dto.canEdit);
  }
}
