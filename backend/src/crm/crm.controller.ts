import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { LeadStatus, MeetingStatus } from '@prisma/client';
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { AddLeadActivityDto } from './dto/add-lead-activity.dto';
import { SaveLeadSourceDto } from './dto/save-lead-source.dto';
import { SaveDailyActivityDto } from './dto/save-daily-activity.dto';
import { SaveCommissionRuleDto } from './dto/save-commission-rule.dto';
import { SaveSalesGoalDto } from './dto/save-sales-goal.dto';
import { SaveSalesTeamMemberDto } from './dto/save-sales-team-member.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

type ReqUser = { userId: string; role: UserRole };

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // --- Leads ---

  @Post('leads')
  createLead(@CurrentUser() user: ReqUser, @Body() dto: CreateLeadDto) {
    return this.crmService.createLead(user.userId, dto);
  }

  @Get('leads')
  listLeads(
    @CurrentUser() user: ReqUser,
    @Query('status') status?: LeadStatus,
    @Query('setterId') setterId?: string,
    @Query('closerId') closerId?: string,
    @Query('leadSourceId') leadSourceId?: string,
    @Query('meetingStatus') meetingStatus?: MeetingStatus,
    @Query('offerMade') offerMade?: string,
    @Query('lossReason') lossReason?: string,
    @Query('search') search?: string,
  ) {
    return this.crmService.listForUser(user.userId, { status, setterId, closerId, leadSourceId, meetingStatus, offerMade, lossReason, search });
  }

  @Get('leads/kanban')
  kanban(@CurrentUser() user: ReqUser) {
    return this.crmService.getKanban(user.userId);
  }

  @Get('leads/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="lead-log.csv"')
  exportLeads(@CurrentUser() user: ReqUser) {
    return this.crmService.exportLeadLog(user.userId);
  }

  @Get('leads/:id')
  getLead(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.crmService.getDetail(id, user.userId);
  }

  @Patch('leads/:id')
  updateLead(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.crmService.updateLead(id, user.userId, dto);
  }

  @Post('leads/:id/assign')
  assignLead(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: AssignLeadDto) {
    return this.crmService.assignLead(id, user.userId, dto);
  }

  @Post('leads/:id/archive')
  archiveLead(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.crmService.archiveLead(id, user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Delete('leads/:id')
  hardDeleteLead(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body('typedLeadName') typedLeadName: string) {
    return this.crmService.hardDeleteLead(id, user.userId, typedLeadName ?? '');
  }

  @Post('leads/:id/activity')
  addActivity(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: AddLeadActivityDto) {
    return this.crmService.addActivity(id, user.userId, dto);
  }

  @Get('leads/:id/activity')
  listActivity(@CurrentUser() user: ReqUser, @Param('id') id: string) {
    return this.crmService.listActivity(id, user.userId);
  }

  @Post('leads/:id/convert-to-client')
  convertToClient(@CurrentUser() user: ReqUser, @Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.crmService.convertToClient(id, user.userId, dto);
  }

  // --- Dashboards ---

  @Get('dashboard')
  dashboard(
    @CurrentUser() user: ReqUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('setterId') setterId?: string,
    @Query('closerId') closerId?: string,
    @Query('leadSourceId') leadSourceId?: string,
  ) {
    return this.crmService.getDashboard(user.userId, { from, to, setterId, closerId, leadSourceId });
  }

  @Get('dashboard/commissions')
  commissionsDashboard(@CurrentUser() user: ReqUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.crmService.getCommissionsDashboard(user.userId, { from, to });
  }

  @Get('my-sales')
  mySales(@CurrentUser() user: ReqUser) {
    return this.crmService.getMySales(user.userId);
  }

  @Get('leaks')
  leaks(@CurrentUser() user: ReqUser) {
    return this.crmService.getSalesLeaks(user.userId);
  }

  @Get('projection')
  projection(
    @CurrentUser() user: ReqUser,
    @Query('month') month: string,
    @Query('bestMultiplier') bestMultiplier?: string,
    @Query('worstMultiplier') worstMultiplier?: string,
  ) {
    return this.crmService.getProjection(user.userId, month, {
      bestMultiplier: bestMultiplier ? Number(bestMultiplier) : undefined,
      worstMultiplier: worstMultiplier ? Number(worstMultiplier) : undefined,
    });
  }

  // --- Daily setter activity ---

  @Post('daily-activity')
  saveDailyActivity(@CurrentUser() user: ReqUser, @Body() dto: SaveDailyActivityDto) {
    return this.crmService.saveDailyActivity(user.userId, dto);
  }

  @Get('daily-activity/mine')
  myDailyActivity(@CurrentUser() user: ReqUser) {
    return this.crmService.listMyDailyActivity(user.userId);
  }

  // --- Settings (super_admin only) ---

  @Get('sources')
  listSources() {
    return this.crmService.listSources();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('sources')
  createSource(@Body() dto: SaveLeadSourceDto) {
    return this.crmService.saveSource(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Patch('sources/:id')
  updateSource(@Param('id') id: string, @Body() dto: SaveLeadSourceDto) {
    return this.crmService.saveSource(dto, id);
  }

  @Get('team')
  listTeam() {
    return this.crmService.listTeam();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('team')
  saveTeamMember(@CurrentUser() user: ReqUser, @Body() dto: SaveSalesTeamMemberDto) {
    return this.crmService.saveTeamMember(dto, user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('commission-rules')
  listCommissionRules() {
    return this.crmService.getCommissionRuleList();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('commission-rules')
  saveCommissionRule(@CurrentUser() user: ReqUser, @Body() dto: SaveCommissionRuleDto) {
    return this.crmService.saveCommissionRule(dto, user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Get('goals/:period')
  getGoal(@Param('period') period: string) {
    return this.crmService.getGoal(period);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.super_admin)
  @Post('goals')
  setGoal(@CurrentUser() user: ReqUser, @Body() dto: SaveSalesGoalDto) {
    return this.crmService.setGoal(dto, user.userId);
  }
}
