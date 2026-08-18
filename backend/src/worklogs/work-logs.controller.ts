import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { WorkLogsService } from './work-logs.service';
import { SaveWorkLogDto } from './dto/save-work-log.dto';
import { ReviewWorkLogDto } from './dto/review-work-log.dto';
import { WorkLogStatus } from '@prisma/client';

@ApiTags('worklogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('worklogs')
export class WorkLogsController {
  constructor(private readonly workLogsService: WorkLogsService) {}

  // --- Self-service ---

  @Post()
  upsert(@CurrentUser() user: { userId: string }, @Body() dto: SaveWorkLogDto) {
    return this.workLogsService.upsert(user.userId, dto);
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.workLogsService.submit(user.userId, id);
  }

  @Get('me/today')
  today(@CurrentUser() user: { userId: string }) {
    return this.workLogsService.getToday(user.userId);
  }

  @Get('me')
  listMine(@CurrentUser() user: { userId: string }, @Query('from') from?: string, @Query('to') to?: string) {
    return this.workLogsService.listForUser(user.userId, { from, to });
  }

  // --- Manager / Super Admin review ---

  @UseGuards(RolesGuard)
  @Roles(UserRole.manager, UserRole.super_admin)
  @Get('team')
  listForReviewer(
    @CurrentUser() user: { userId: string; role: UserRole },
    @Query('employeeId') employeeId?: string,
    @Query('department') department?: string,
    @Query('status') status?: WorkLogStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.workLogsService.listForReviewer(user.userId, user.role, {
      employeeId,
      department,
      status,
      from,
      to,
      search,
    });
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.manager, UserRole.super_admin)
  @Get('pending')
  pending(@CurrentUser() user: { userId: string; role: UserRole }, @Query('date') date?: string) {
    return this.workLogsService.pendingSubmissions(user.userId, user.role, date);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.manager, UserRole.super_admin)
  @Patch(':id/review')
  review(
    @CurrentUser() user: { userId: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: ReviewWorkLogDto,
  ) {
    return this.workLogsService.review(user.userId, user.role, id, dto);
  }

  // --- Super admin analytics ---

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('analytics')
  analytics(@Query('from') from?: string, @Query('to') to?: string, @Query('department') department?: string) {
    return this.workLogsService.analytics({ from, to, department });
  }
}
