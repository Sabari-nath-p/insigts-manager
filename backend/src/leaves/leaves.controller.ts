import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { LeavesService } from './leaves.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { LeaveStatus } from './leave-request.entity';

@ApiTags('leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  apply(@CurrentUser() user: { userId: string }, @Body() dto: ApplyLeaveDto) {
    return this.leavesService.apply(user.userId, dto);
  }

  @Get('me')
  listMine(@CurrentUser() user: { userId: string }) {
    return this.leavesService.listForUser(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  listAll(@Query('status') status?: LeaveStatus) {
    return this.leavesService.listAll(status);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id/review')
  review(
    @CurrentUser() admin: { userId: string },
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.leavesService.review(admin.userId, id, dto);
  }
}
