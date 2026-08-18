import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeResource, KnowledgeResourceStatus, KnowledgeResourceType, KnowledgeVisibility, User, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveKnowledgeResourceDto } from './dto/save-knowledge-resource.dto';
import { UpdateKnowledgeResourceDto } from './dto/update-knowledge-resource.dto';
import { UploadKnowledgeResourceDto } from './dto/upload-knowledge-resource.dto';

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
  'application/zip',
]);

export function parseCsv(value?: string): string[] | undefined {
  if (value === undefined) return undefined;
  const items = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export function validateUpload(file?: Express.Multer.File): void {
  if (!file) {
    throw new BadRequestException('A file is required');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new BadRequestException('File exceeds the 20MB limit');
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
  }
}

// Prisma has no column-level "never select by default" — unlike TypeORM's `select: false`,
// every general-purpose query must explicitly leave `fileData` out, or the raw blob bytes would
// ship in every list/detail response. Only getFileForUser's dedicated select includes it.
const SAFE_SELECT = {
  id: true,
  title: true,
  description: true,
  categoryGroup: true,
  category: true,
  tags: true,
  type: true,
  status: true,
  content: true,
  externalUrl: true,
  fileName: true,
  fileMimeType: true,
  fileSize: true,
  visibility: true,
  allowedDepartments: true,
  allowedRoles: true,
  createdBy: true,
  updatedBy: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.KnowledgeResourceSelect;

type SafeResource = Omit<KnowledgeResource, 'fileData'>;

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

  private async getRequester(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Super admins manage everything (drafts/archived included); everyone else only sees
   * published resources they're permitted to see. */
  private isVisibleTo(
    resource: Pick<KnowledgeResource, 'status' | 'visibility' | 'allowedDepartments' | 'allowedRoles'>,
    requester: User,
  ): boolean {
    if (requester.role === UserRole.super_admin) return true;
    if (resource.status !== KnowledgeResourceStatus.published) return false;
    if (resource.visibility !== KnowledgeVisibility.restricted) return true;

    const allowedDepartments = (resource.allowedDepartments as string[] | null) ?? null;
    const allowedRoles = (resource.allowedRoles as UserRole[] | null) ?? null;

    // Each axis independently gates access: an empty list means that axis imposes no
    // restriction (passes trivially), but a populated axis must actually match — both
    // configured axes must pass. (OR here would mean "restrict by department" silently
    // grants access to everyone once allowedRoles is left empty, which is the common case.)
    const departmentAllowed = !allowedDepartments?.length || (!!requester.department && allowedDepartments.includes(requester.department));
    const roleAllowed = !allowedRoles?.length || allowedRoles.includes(requester.role);
    return departmentAllowed && roleAllowed;
  }

  async listForUser(userId: string): Promise<SafeResource[]> {
    const requester = await this.getRequester(userId);
    const resources = await this.prisma.knowledgeResource.findMany({ select: SAFE_SELECT, orderBy: { updatedAt: 'desc' } });
    return resources.filter((r) => this.isVisibleTo(r, requester));
  }

  private async getOrFail(id: string): Promise<SafeResource> {
    const resource = await this.prisma.knowledgeResource.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }

  async create(adminId: string, dto: SaveKnowledgeResourceDto): Promise<SafeResource> {
    if (dto.type === KnowledgeResourceType.file) {
      throw new BadRequestException('Use the upload endpoint to create a file resource');
    }
    return this.prisma.knowledgeResource.create({
      select: SAFE_SELECT,
      data: {
        title: dto.title,
        description: dto.description ?? null,
        categoryGroup: dto.categoryGroup,
        category: dto.category,
        tags: dto.tags ?? undefined,
        type: dto.type,
        status: dto.status ?? KnowledgeResourceStatus.draft,
        content: dto.type === KnowledgeResourceType.document ? dto.content ?? null : null,
        externalUrl: dto.type === KnowledgeResourceType.link ? dto.externalUrl ?? null : null,
        visibility: dto.visibility ?? KnowledgeVisibility.all,
        allowedDepartments: dto.allowedDepartments ?? undefined,
        allowedRoles: dto.allowedRoles ?? undefined,
        createdBy: adminId,
        publishedAt: dto.status === KnowledgeResourceStatus.published ? new Date() : null,
      },
    });
  }

  async createFromUpload(adminId: string, dto: UploadKnowledgeResourceDto, file: Express.Multer.File): Promise<SafeResource> {
    validateUpload(file);
    return this.prisma.knowledgeResource.create({
      select: SAFE_SELECT,
      data: {
        title: dto.title,
        description: dto.description ?? null,
        categoryGroup: dto.categoryGroup,
        category: dto.category,
        tags: parseCsv(dto.tags) ?? undefined,
        type: KnowledgeResourceType.file,
        status: dto.status ?? KnowledgeResourceStatus.draft,
        fileName: file.originalname,
        fileMimeType: file.mimetype,
        fileSize: file.size,
        fileData: file.buffer,
        visibility: dto.visibility ?? KnowledgeVisibility.all,
        allowedDepartments: parseCsv(dto.allowedDepartments) ?? undefined,
        allowedRoles: parseCsv(dto.allowedRoles) ?? undefined,
        createdBy: adminId,
        publishedAt: dto.status === KnowledgeResourceStatus.published ? new Date() : null,
      },
    });
  }

  async update(adminId: string, id: string, dto: UpdateKnowledgeResourceDto): Promise<SafeResource> {
    const resource = await this.getOrFail(id);

    const data: Prisma.KnowledgeResourceUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.categoryGroup !== undefined) data.categoryGroup = dto.categoryGroup;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.tags !== undefined) data.tags = dto.tags ?? Prisma.JsonNull;
    if (dto.content !== undefined && resource.type === KnowledgeResourceType.document) data.content = dto.content ?? null;
    if (dto.externalUrl !== undefined && resource.type === KnowledgeResourceType.link) data.externalUrl = dto.externalUrl ?? null;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.allowedDepartments !== undefined) data.allowedDepartments = dto.allowedDepartments ?? Prisma.JsonNull;
    if (dto.allowedRoles !== undefined) data.allowedRoles = dto.allowedRoles ?? Prisma.JsonNull;

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === KnowledgeResourceStatus.published && !resource.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    data.updatedBy = adminId;
    return this.prisma.knowledgeResource.update({ where: { id }, data, select: SAFE_SELECT });
  }

  async replaceFile(adminId: string, id: string, file: Express.Multer.File): Promise<SafeResource> {
    const resource = await this.getOrFail(id);
    if (resource.type !== KnowledgeResourceType.file) {
      throw new BadRequestException('Only a file-type resource can have its file replaced');
    }
    validateUpload(file);
    return this.prisma.knowledgeResource.update({
      where: { id },
      select: SAFE_SELECT,
      data: {
        fileName: file.originalname,
        fileMimeType: file.mimetype,
        fileSize: file.size,
        fileData: file.buffer,
        updatedBy: adminId,
      },
    });
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.knowledgeResource.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Resource not found');
    }
  }

  async getFileForUser(
    userId: string,
    id: string,
  ): Promise<{ fileName: string; fileMimeType: string; fileData: Buffer }> {
    const requester = await this.getRequester(userId);
    const resource = await this.prisma.knowledgeResource.findUnique({
      where: { id },
      select: { ...SAFE_SELECT, fileData: true },
    });
    if (!resource) throw new NotFoundException('Resource not found');
    if (!this.isVisibleTo(resource, requester)) {
      throw new ForbiddenException('You do not have access to this resource');
    }
    if (resource.type !== KnowledgeResourceType.file || !resource.fileData) {
      throw new NotFoundException('This resource has no file attached');
    }
    return {
      fileName: resource.fileName ?? 'download',
      fileMimeType: resource.fileMimeType ?? 'application/octet-stream',
      fileData: Buffer.from(resource.fileData),
    };
  }
}
