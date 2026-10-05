import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PmColumnType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PmAccessService } from './pm-access.service';
import { PmActor } from './pm-permissions';
import { positionBetween } from './pm-position';
import { CreateColumnDto, CreateLabelDto, CreateProjectDto, UpdateColumnDto, UpdateProjectDto } from './dto/pm.dto';

const DEFAULT_COLUMNS: Array<{ name: string; type: PmColumnType }> = [
  { name: 'Todo', type: 'todo' },
  { name: 'Doing', type: 'doing' },
  { name: 'Review', type: 'review' },
  { name: 'Done', type: 'done' },
];

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PmAccessService,
  ) {}

  async getByKey(key: string) {
    const project = await this.prisma.pmProject.findUnique({ where: { key: key.toUpperCase() } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async list() {
    const [projects, open] = await Promise.all([
      this.prisma.pmProject.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }] }),
      // Open = not archived and not sitting in a `done` column.
      this.prisma.$queryRaw<Array<{ projectId: string; open: bigint }>>`
        SELECT t.projectId AS projectId, COUNT(*) AS open
        FROM pm_tasks t JOIN pm_columns c ON c.id = t.columnId
        WHERE t.archivedAt IS NULL AND c.type <> 'done'
        GROUP BY t.projectId`,
    ]);
    const counts = new Map(open.map((r) => [r.projectId, Number(r.open)]));
    return projects.map((p) => ({ ...p, openTasks: counts.get(p.id) ?? 0 }));
  }

  async create(actor: PmActor, dto: CreateProjectDto) {
    this.access.assert(actor, 'project.create');
    if (await this.prisma.pmProject.findUnique({ where: { key: dto.key } })) {
      throw new ConflictException(`Key ${dto.key} is already used by another project`);
    }
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.pmProject.create({
        data: { key: dto.key, name: dto.name.trim(), color: dto.color, description: dto.description, createdBy: actor.userId },
      });
      await tx.pmColumn.createMany({
        data: DEFAULT_COLUMNS.map((c, i) => ({ projectId: project.id, name: c.name, type: c.type, position: (i + 1) * 1000 })),
      });
      return project;
    });
  }

  async detail(key: string) {
    const project = await this.getByKey(key);
    const [columns, labels] = await Promise.all([
      this.prisma.pmColumn.findMany({ where: { projectId: project.id }, orderBy: { position: 'asc' } }),
      this.prisma.pmLabel.findMany({ where: { projectId: project.id }, orderBy: { name: 'asc' } }),
    ]);
    return { ...project, columns, labels };
  }

  async update(actor: PmActor, key: string, dto: UpdateProjectDto) {
    this.access.assert(actor, 'project.edit');
    const project = await this.getByKey(key);
    return this.prisma.pmProject.update({
      where: { id: project.id },
      data: { name: dto.name?.trim(), color: dto.color, description: dto.description },
    });
  }

  async setArchived(actor: PmActor, key: string, archived: boolean) {
    const project = await this.getByKey(key);
    this.access.assert(actor, 'project.archive', { createdBy: project.createdBy });
    return this.prisma.pmProject.update({ where: { id: project.id }, data: { status: archived ? 'archived' : 'active' } });
  }

  async remove(actor: PmActor, key: string) {
    this.access.assert(actor, 'project.delete');
    const project = await this.getByKey(key);
    await this.prisma.$transaction(async (tx) => {
      const taskIds = (await tx.pmTask.findMany({ where: { projectId: project.id }, select: { id: true } })).map((t) => t.id);
      await tx.pmTaskLabel.deleteMany({ where: { taskId: { in: taskIds } } });
      await tx.pmUpdate.deleteMany({ where: { taskId: { in: taskIds } } });
      await tx.pmNotification.deleteMany({ where: { taskId: { in: taskIds } } });
      await tx.pmActivity.deleteMany({ where: { projectId: project.id } });
      await tx.pmTask.deleteMany({ where: { projectId: project.id } });
      await tx.pmLabel.deleteMany({ where: { projectId: project.id } });
      await tx.pmColumn.deleteMany({ where: { projectId: project.id } });
      await tx.pmProject.delete({ where: { id: project.id } });
    });
    return { ok: true };
  }

  // --- Columns -----------------------------------------------------------

  async createColumn(actor: PmActor, key: string, dto: CreateColumnDto) {
    this.access.assert(actor, 'task.edit');
    const project = await this.getByKey(key);
    const last = await this.prisma.pmColumn.findFirst({ where: { projectId: project.id }, orderBy: { position: 'desc' } });
    return this.prisma.pmColumn.create({
      data: { projectId: project.id, name: dto.name.trim(), type: dto.type, position: positionBetween(last?.position ?? null, null) },
    });
  }

  async updateColumn(actor: PmActor, columnId: string, dto: UpdateColumnDto) {
    this.access.assert(actor, 'task.edit');
    const column = await this.prisma.pmColumn.findUnique({ where: { id: columnId } });
    if (!column) throw new NotFoundException('Column not found');
    let position: number | undefined;
    if (dto.afterColumnId !== undefined) {
      const siblings = await this.prisma.pmColumn.findMany({
        where: { projectId: column.projectId, id: { not: column.id } },
        orderBy: { position: 'asc' },
      });
      const idx = dto.afterColumnId === '' ? -1 : siblings.findIndex((c) => c.id === dto.afterColumnId);
      if (dto.afterColumnId !== '' && idx === -1) throw new BadRequestException('Unknown column');
      position = positionBetween(siblings[idx]?.position ?? null, siblings[idx + 1]?.position ?? null);
    }
    return this.prisma.pmColumn.update({ where: { id: columnId }, data: { name: dto.name?.trim(), position } });
  }

  async removeColumn(actor: PmActor, columnId: string) {
    this.access.assert(actor, 'task.edit');
    const column = await this.prisma.pmColumn.findUnique({ where: { id: columnId } });
    if (!column) throw new NotFoundException('Column not found');
    const [taskCount, doneCount] = await Promise.all([
      this.prisma.pmTask.count({ where: { columnId } }),
      this.prisma.pmColumn.count({ where: { projectId: column.projectId, type: 'done' } }),
    ]);
    if (taskCount > 0) throw new BadRequestException("Move this column's tasks elsewhere before deleting it");
    if (column.type === 'done' && doneCount <= 1) throw new BadRequestException('A project needs at least one Done column');
    await this.prisma.pmColumn.delete({ where: { id: columnId } });
    return { ok: true };
  }

  // --- Labels ------------------------------------------------------------

  async createLabel(actor: PmActor, key: string, dto: CreateLabelDto) {
    this.access.assert(actor, 'task.edit');
    const project = await this.getByKey(key);
    try {
      return await this.prisma.pmLabel.create({ data: { projectId: project.id, name: dto.name.trim(), color: dto.color } });
    } catch {
      throw new ConflictException('That label already exists');
    }
  }

  async removeLabel(actor: PmActor, labelId: string) {
    this.access.assert(actor, 'task.edit');
    await this.prisma.pmTaskLabel.deleteMany({ where: { labelId } });
    await this.prisma.pmLabel.deleteMany({ where: { id: labelId } });
    return { ok: true };
  }
}
