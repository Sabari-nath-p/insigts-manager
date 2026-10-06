import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PmAccessGuard } from './pm-access.guard';
import { PmAccessService } from './pm-access.service';
import { PmUser } from './pm-actor.decorator';
import { PmActor } from './pm-permissions';
import { ProjectsService } from './projects.service';
import { TasksService } from './tasks.service';
import { InsightsService } from './insights.service';
import {
  BoardQueryDto,
  CreateColumnDto,
  CreateLabelDto,
  CreateProjectDto,
  CreateTaskDto,
  InsightsQueryDto,
  MoveTaskDto,
  PostUpdateDto,
  SetAccessDto,
  UpdateColumnDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from './dto/pm.dto';

/**
 * Everything under /pm. Isolated from attendance / CRM: reads `users` only, writes `pm_*` only.
 * JwtAuthGuard authenticates; PmAccessGuard resolves the user's project-management role.
 */
@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PmAccessGuard)
@Controller('pm')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly tasks: TasksService,
    private readonly insights: InsightsService,
    private readonly prisma: PrismaService,
    private readonly access: PmAccessService,
  ) {}

  @Get('me')
  async me(@PmUser() actor: PmActor, @CurrentUser() user: { userId: string; email: string }) {
    const u = await this.prisma.user.findUnique({ where: { id: user.userId }, select: { fullName: true } });
    return { userId: actor.userId, role: actor.role, name: u?.fullName ?? user.email, email: user.email };
  }

  // --- Projects ----------------------------------------------------------

  @Get('projects')
  listProjects() {
    return this.projects.list();
  }

  @Post('projects')
  createProject(@PmUser() actor: PmActor, @Body() dto: CreateProjectDto) {
    return this.projects.create(actor, dto);
  }

  @Get('projects/:key')
  project(@Param('key') key: string) {
    return this.projects.detail(key);
  }

  @Patch('projects/:key')
  updateProject(@PmUser() actor: PmActor, @Param('key') key: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(actor, key, dto);
  }

  @Post('projects/:key/archive')
  archiveProject(@PmUser() actor: PmActor, @Param('key') key: string) {
    return this.projects.setArchived(actor, key, true);
  }

  @Post('projects/:key/restore')
  restoreProject(@PmUser() actor: PmActor, @Param('key') key: string) {
    return this.projects.setArchived(actor, key, false);
  }

  @Delete('projects/:key')
  deleteProject(@PmUser() actor: PmActor, @Param('key') key: string) {
    return this.projects.remove(actor, key);
  }

  @Get('projects/:key/board')
  board(
    @PmUser() actor: PmActor,
    @Param('key') key: string,
    @Query() q: BoardQueryDto,
    @Query('olderDone') olderDone?: string,
  ) {
    return this.tasks.board(actor.userId, key, q, olderDone === '1');
  }

  @Post('projects/:key/columns')
  createColumn(@PmUser() actor: PmActor, @Param('key') key: string, @Body() dto: CreateColumnDto) {
    return this.projects.createColumn(actor, key, dto);
  }

  @Patch('columns/:id')
  updateColumn(@PmUser() actor: PmActor, @Param('id') id: string, @Body() dto: UpdateColumnDto) {
    return this.projects.updateColumn(actor, id, dto);
  }

  @Delete('columns/:id')
  deleteColumn(@PmUser() actor: PmActor, @Param('id') id: string) {
    return this.projects.removeColumn(actor, id);
  }

  @Post('projects/:key/labels')
  createLabel(@PmUser() actor: PmActor, @Param('key') key: string, @Body() dto: CreateLabelDto) {
    return this.projects.createLabel(actor, key, dto);
  }

  @Delete('labels/:id')
  deleteLabel(@PmUser() actor: PmActor, @Param('id') id: string) {
    return this.projects.removeLabel(actor, id);
  }

  @Post('projects/:key/tasks')
  createTask(@PmUser() actor: PmActor, @Param('key') key: string, @Body() dto: CreateTaskDto) {
    return this.tasks.create(actor, key, dto);
  }

  // --- Tasks (ref is either KEY-12 or a task id) -------------------------

  @Get('tasks/:ref')
  task(@Param('ref') ref: string) {
    return this.tasks.detail(ref);
  }

  @Patch('tasks/:ref')
  updateTask(@PmUser() actor: PmActor, @Param('ref') ref: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(actor, ref, dto);
  }

  @Post('tasks/:ref/move')
  moveTask(@PmUser() actor: PmActor, @Param('ref') ref: string, @Body() dto: MoveTaskDto) {
    return this.tasks.move(actor, ref, dto);
  }

  @Post('tasks/:ref/archive')
  archiveTask(@PmUser() actor: PmActor, @Param('ref') ref: string) {
    return this.tasks.setArchived(actor, ref, true);
  }

  @Post('tasks/:ref/restore')
  restoreTask(@PmUser() actor: PmActor, @Param('ref') ref: string) {
    return this.tasks.setArchived(actor, ref, false);
  }

  @Delete('tasks/:ref')
  deleteTask(@PmUser() actor: PmActor, @Param('ref') ref: string) {
    return this.tasks.remove(actor, ref);
  }

  @Post('tasks/:ref/updates')
  postUpdate(@PmUser() actor: PmActor, @Param('ref') ref: string, @Body() dto: PostUpdateDto) {
    return this.tasks.postUpdate(actor, ref, dto);
  }

  // --- My work, notifications, team --------------------------------------

  @Get('my-work')
  myWork(@PmUser() actor: PmActor) {
    return this.tasks.myWork(actor.userId);
  }

  @Get('notifications')
  notifications(@PmUser() actor: PmActor) {
    return this.tasks.notifications(actor.userId);
  }

  @Post('notifications/read-all')
  readAll(@PmUser() actor: PmActor) {
    return this.tasks.markRead(actor.userId);
  }

  @Post('notifications/:id/read')
  readOne(@PmUser() actor: PmActor, @Param('id') id: string) {
    return this.tasks.markRead(actor.userId, id);
  }

  @Get('search')
  search(@Query('q') q = '') {
    return this.tasks.search(q);
  }

  @Get('members')
  members() {
    return this.tasks.members();
  }

  /** Team page: active users with open task counts and last activity, plus each person's PM access. */
  @Get('team')
  async team(@PmUser() actor: PmActor) {
    const [members, open, last, overrides] = await Promise.all([
      this.tasks.members(),
      this.prisma.$queryRaw<Array<{ assigneeId: string; v: bigint }>>`
        SELECT t.assigneeId AS assigneeId, COUNT(*) AS v FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId
        WHERE t.assigneeId IS NOT NULL AND t.archivedAt IS NULL AND c.type <> 'done' GROUP BY t.assigneeId`,
      this.prisma.$queryRaw<Array<{ actorId: string; at: Date }>>`SELECT actorId, MAX(createdAt) AS at FROM pm_activity GROUP BY actorId`,
      this.prisma.pmMember.findMany(),
    ]);
    const openMap = new Map(open.map((r) => [r.assigneeId, Number(r.v)]));
    const lastMap = new Map(last.map((r) => [r.actorId, r.at]));
    const overrideMap = new Map(overrides.map((o) => [o.userId, o]));
    const canManage = this.access.can(actor, 'team.manage');
    return {
      canManage,
      members: members.map((m) => {
        const o = overrideMap.get(m.id);
        return {
          ...m,
          openTasks: openMap.get(m.id) ?? 0,
          lastActive: lastMap.get(m.id) ?? null,
          pmRole: o?.role ?? (m.role === 'super_admin' ? 'admin' : 'staff'),
          pmRevoked: o?.revoked ?? false,
        };
      }),
    };
  }

  /** Admins decide who gets project-management admin access, or loses access entirely. */
  @Put('team/:userId/access')
  async setAccess(@PmUser() actor: PmActor, @Param('userId') userId: string, @Body() dto: SetAccessDto) {
    this.access.assert(actor, 'team.manage');
    if (userId === actor.userId && (dto.revoked || dto.role !== 'admin')) {
      return { ok: false, message: 'You cannot remove your own admin access' };
    }
    await this.prisma.pmMember.upsert({
      where: { userId },
      create: { userId, role: dto.role, revoked: dto.revoked },
      update: { role: dto.role, revoked: dto.revoked },
    });
    return { ok: true };
  }

  // --- Insights ----------------------------------------------------------

  @Get('insights')
  insightsData(@PmUser() actor: PmActor, @Query() q: InsightsQueryDto) {
    return this.insights.insights(actor, q);
  }

  @Get('insights/me')
  myStats(@PmUser() actor: PmActor) {
    return this.insights.myStats(actor.userId);
  }

  @Get('insights/export/:report')
  async exportReport(
    @PmUser() actor: PmActor,
    @Param('report') report: string,
    @Query() q: InsightsQueryDto,
    @Res() res: Response,
  ) {
    const { filename, body } = await this.insights.exportCsv(actor, report, q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  }

  @Get('activity')
  activity(@Query('project') project?: string, @Query('member') member?: string) {
    return this.insights.activityFeed({ project, member, limit: 50 });
  }

  /** Manual trigger for the daily due-soon job (also runs on a schedule). Admin only. */
  @Post('cron/due-soon')
  async dueSoon(@PmUser() actor: PmActor) {
    this.access.assert(actor, 'team.manage');
    return { notified: await this.tasks.notifyDueSoon() };
  }
}
