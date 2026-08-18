import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Client,
  ClientStatus,
  ClientContact,
  ClientTeamMember,
  ClientServiceEntity,
  ClientGoal,
  ClientAsset,
  ClientResourceKind,
  ClientDocument,
  ClientLink,
  ClientNote,
  ClientMeeting,
  ClientActivity,
  User,
  UserRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientContactDto } from './dto/client-contact.dto';
import { SaveClientTeamMemberDto } from './dto/client-team-member.dto';
import { SaveClientServiceDto } from './dto/client-service.dto';
import { SaveClientGoalDto } from './dto/client-goal.dto';
import { CreateClientAssetLinkDto, UploadClientAssetDto } from './dto/client-asset.dto';
import { UploadClientDocumentDto } from './dto/client-document.dto';
import { SaveClientLinkDto } from './dto/client-link.dto';
import { SaveClientNoteDto } from './dto/client-note.dto';
import { SaveClientMeetingDto } from './dto/client-meeting.dto';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_ASSET_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/quicktime',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/postscript', // .ai
  'application/x-photoshop',
]);
const ALLOWED_LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

// Prisma has no column-level "never select by default" (unlike TypeORM's `select: false`) — every
// general-purpose query on a model with a blob column must explicitly leave it out, or the raw
// bytes would ship in list/detail responses. Only the dedicated file/logo download methods select it.
const CLIENT_SAFE_SELECT = {
  id: true,
  clientName: true,
  companyName: true,
  website: true,
  industry: true,
  niche: true,
  location: true,
  companyDescription: true,
  aboutText: true,
  status: true,
  dateOnboarded: true,
  contractStartDate: true,
  contractEndDate: true,
  accountManagerId: true,
  mission: true,
  vision: true,
  coreValues: true,
  targetAudiencePrimary: true,
  targetAudienceSecondary: true,
  targetAudienceAgeGroup: true,
  targetAudienceLocation: true,
  targetAudienceInterests: true,
  targetAudiencePainPoints: true,
  targetAudienceBuyingBehavior: true,
  businessModel: true,
  productsServices: true,
  keyDifferentiators: true,
  founded: true,
  companySize: true,
  locations: true,
  brandName: true,
  tagline: true,
  brandDescription: true,
  brandPersonality: true,
  brandVoice: true,
  toneOfVoice: true,
  communicationStyle: true,
  primaryColors: true,
  secondaryColors: true,
  accentColors: true,
  headingFont: true,
  bodyFont: true,
  logoUsageRules: true,
  preferredCommunicationMethod: true,
  preferredMeetingTime: true,
  preferredContentStyle: true,
  preferredColors: true,
  thingsToAvoid: true,
  approvalProcess: true,
  reportingPreferences: true,
  specialRequirements: true,
  retainerValue: true,
  retainerPackage: true,
  renewalDate: true,
  retainerNotes: true,
  currentPriority: true,
  currentStrategy: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClientSelect;

type SafeClient = Omit<Client, 'logoMimeType' | 'logoData'>;

const ASSET_SAFE_SELECT = {
  id: true,
  clientId: true,
  name: true,
  folder: true,
  description: true,
  tags: true,
  kind: true,
  fileName: true,
  fileMimeType: true,
  fileSize: true,
  externalUrl: true,
  version: true,
  isRestricted: true,
  uploadedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClientAssetSelect;

type SafeAsset = Omit<ClientAsset, 'fileData'>;

const DOCUMENT_SAFE_SELECT = {
  id: true,
  clientId: true,
  name: true,
  category: true,
  fileName: true,
  fileMimeType: true,
  fileSize: true,
  version: true,
  description: true,
  isConfidential: true,
  uploadedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClientDocumentSelect;

type SafeDocument = Omit<ClientDocument, 'fileData'>;

interface AccessContext {
  client: SafeClient;
  requester: User;
  isSuperAdmin: boolean;
  isAccountManager: boolean;
  isTeamMember: boolean;
  canView: boolean;
  canManage: boolean; // edit core client fields, settings, team roster, services, links, documents
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Access control
  // ==========================================================================

  private async getRequester(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async getClientOrFail(id: string): Promise<SafeClient> {
    const client = await this.prisma.client.findUnique({ where: { id }, select: CLIENT_SAFE_SELECT });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private async buildContext(clientId: string, userId: string): Promise<AccessContext> {
    const [client, requester] = await Promise.all([this.getClientOrFail(clientId), this.getRequester(userId)]);
    const isSuperAdmin = requester.role === UserRole.super_admin;
    const isAccountManager = client.accountManagerId === userId;
    const isTeamMember =
      isSuperAdmin || isAccountManager ? false : !!(await this.prisma.clientTeamMember.findFirst({ where: { clientId, userId } }));
    return {
      client,
      requester,
      isSuperAdmin,
      isAccountManager,
      isTeamMember,
      canView: isSuperAdmin || isAccountManager || isTeamMember,
      canManage: isSuperAdmin || isAccountManager,
    };
  }

  private assertCanView(ctx: AccessContext): void {
    if (!ctx.canView) throw new ForbiddenException('You do not have access to this client');
  }

  private assertCanManage(ctx: AccessContext): void {
    if (!ctx.canManage) throw new ForbiddenException('Only the account manager or a super admin can do this');
  }

  /** For contributable items (notes, meetings, goals, non-restricted assets): the client's
   * manager tier can edit/delete anything, everyone else only their own contribution. */
  private assertCanEditOwnOrManage(ctx: AccessContext, ownerId: string): void {
    if (!ctx.canManage && ownerId !== ctx.requester.id) {
      throw new ForbiddenException('You can only edit or remove your own contribution');
    }
  }

  private redactFinancials<T extends Pick<SafeClient, 'retainerValue' | 'retainerNotes'>>(client: T, ctx: AccessContext): T {
    if (!ctx.canManage) {
      client.retainerValue = null;
      client.retainerNotes = null;
    }
    return client;
  }

  private async logActivity(clientId: string, actorUserId: string, action: string, description: string): Promise<void> {
    await this.prisma.clientActivity.create({ data: { clientId, actorUserId, action, description } });
  }

  // ==========================================================================
  // Clients — list / detail / create / update / delete
  // ==========================================================================

  async listForUser(userId: string): Promise<(SafeClient & { activeServicesCount: number; teamSize: number })[]> {
    const requester = await this.getRequester(userId);
    const isSuperAdmin = requester.role === UserRole.super_admin;

    const [allClients, myTeamRows] = await Promise.all([
      this.prisma.client.findMany({ select: CLIENT_SAFE_SELECT, orderBy: { updatedAt: 'desc' } }),
      isSuperAdmin ? Promise.resolve([]) : this.prisma.clientTeamMember.findMany({ where: { userId } }),
    ]);
    const myClientIds = new Set(myTeamRows.map((t) => t.clientId));

    const visible = allClients.filter((c) => isSuperAdmin || c.accountManagerId === userId || myClientIds.has(c.id));
    if (!visible.length) return [];

    const clientIds = visible.map((c) => c.id);
    const accountManagerIds = Array.from(new Set(visible.map((c) => c.accountManagerId).filter((v): v is string => !!v)));
    const [services, teamCounts, accountManagers] = await Promise.all([
      this.prisma.clientServiceEntity.findMany({ where: { clientId: { in: clientIds } } }),
      this.prisma.clientTeamMember.findMany({ where: { clientId: { in: clientIds } } }),
      accountManagerIds.length ? this.prisma.user.findMany({ where: { id: { in: accountManagerIds } } }) : Promise.resolve([]),
    ]);
    const managerNameById = new Map(accountManagers.map((u) => [u.id, u.fullName]));

    return visible.map((client) => {
      const ctx: AccessContext = {
        client,
        requester,
        isSuperAdmin,
        isAccountManager: client.accountManagerId === userId,
        isTeamMember: myClientIds.has(client.id),
        canView: true,
        canManage: isSuperAdmin || client.accountManagerId === userId,
      };
      this.redactFinancials(client, ctx);
      return {
        ...client,
        accountManagerName: client.accountManagerId ? managerNameById.get(client.accountManagerId) ?? null : null,
        activeServicesCount: services.filter((s) => s.clientId === client.id && s.status === 'active').length,
        serviceNames: services.filter((s) => s.clientId === client.id).map((s) => s.name),
        teamSize: teamCounts.filter((t) => t.clientId === client.id).length,
      };
    });
  }

  /** Strictly "clients I'm personally assigned to" (account manager or team member) — used by
   * the dashboard's "My Clients" widget, unlike listForUser() which also expands to everything
   * for a super admin. */
  async listMine(userId: string): Promise<Pick<Client, 'id' | 'clientName' | 'status' | 'industry'>[]> {
    const teamRows = await this.prisma.clientTeamMember.findMany({ where: { userId } });
    const managedClients = await this.prisma.client.findMany({ where: { accountManagerId: userId }, select: CLIENT_SAFE_SELECT });
    const teamClientIds = teamRows.map((t) => t.clientId);
    const teamClients = teamClientIds.length
      ? await this.prisma.client.findMany({ where: { id: { in: teamClientIds } }, select: CLIENT_SAFE_SELECT })
      : [];
    const byId = new Map([...managedClients, ...teamClients].map((c) => [c.id, c]));
    return Array.from(byId.values())
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
      .map((c) => ({ id: c.id, clientName: c.clientName, status: c.status, industry: c.industry }));
  }

  async getDetail(id: string, userId: string): Promise<SafeClient & { accountManagerName: string | null }> {
    const ctx = await this.buildContext(id, userId);
    this.assertCanView(ctx);
    const client = this.redactFinancials(ctx.client, ctx);
    const manager = client.accountManagerId ? await this.prisma.user.findUnique({ where: { id: client.accountManagerId } }) : null;
    return { ...client, accountManagerName: manager?.fullName ?? null };
  }

  async create(adminId: string, dto: CreateClientDto): Promise<Client> {
    return this.prisma.$transaction(async (tx) => {
      const saved = await tx.client.create({
        data: {
          clientName: dto.clientName,
          companyName: dto.companyName ?? null,
          website: dto.website ?? null,
          industry: dto.industry ?? null,
          niche: dto.niche ?? null,
          location: dto.location ?? null,
          companyDescription: dto.companyDescription ?? null,
          aboutText: dto.aboutText ?? null,
          status: dto.status ?? ClientStatus.onboarding,
          dateOnboarded: dto.dateOnboarded ?? null,
          contractStartDate: dto.contractStartDate ?? null,
          contractEndDate: dto.contractEndDate ?? null,
          accountManagerId: dto.accountManagerId ?? null,
          createdBy: adminId,
        },
      });

      if (dto.contacts?.length) {
        await tx.clientContact.createMany({
          data: dto.contacts.map((c: ClientContactDto) => ({ ...c, clientId: saved.id })),
        });
      }

      await tx.clientActivity.create({
        data: {
          clientId: saved.id,
          actorUserId: adminId,
          action: 'created_client',
          description: `Client "${saved.clientName}" was created`,
        },
      });
      return saved;
    });
  }

  async update(id: string, userId: string, dto: UpdateClientDto): Promise<SafeClient> {
    const ctx = await this.buildContext(id, userId);
    this.assertCanManage(ctx);
    const statusChanged = dto.status !== undefined && dto.status !== ctx.client.status;

    // UpdateClientDto's field names are a 1:1 subset of Client's own columns (by design), so a
    // generic merge avoids ~50 repetitive `if (dto.x !== undefined) data.x = dto.x` lines.
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      data[key] = key === 'retainerValue' ? String(value) : value;
    }
    data.updatedBy = userId;

    const saved = await this.prisma.client.update({
      where: { id },
      data: data as Prisma.ClientUpdateInput,
      select: CLIENT_SAFE_SELECT,
    });

    await this.logActivity(id, userId, 'updated_client', 'Client information was updated');
    if (statusChanged) {
      await this.logActivity(id, userId, 'status_changed', `Status changed to "${dto.status}"`);
    }
    return this.redactFinancials(saved, ctx);
  }

  async remove(id: string): Promise<void> {
    await this.getClientOrFail(id);
    await this.prisma.$transaction([
      this.prisma.clientContact.deleteMany({ where: { clientId: id } }),
      this.prisma.clientTeamMember.deleteMany({ where: { clientId: id } }),
      this.prisma.clientServiceEntity.deleteMany({ where: { clientId: id } }),
      this.prisma.clientGoal.deleteMany({ where: { clientId: id } }),
      this.prisma.clientAsset.deleteMany({ where: { clientId: id } }),
      this.prisma.clientDocument.deleteMany({ where: { clientId: id } }),
      this.prisma.clientLink.deleteMany({ where: { clientId: id } }),
      this.prisma.clientNote.deleteMany({ where: { clientId: id } }),
      this.prisma.clientMeeting.deleteMany({ where: { clientId: id } }),
      this.prisma.clientActivity.deleteMany({ where: { clientId: id } }),
      this.prisma.client.delete({ where: { id } }),
    ]);
  }

  // --- Logo ---

  async uploadLogo(id: string, userId: string, file?: Express.Multer.File): Promise<SafeClient> {
    const ctx = await this.buildContext(id, userId);
    this.assertCanManage(ctx);
    if (!file) throw new BadRequestException('A logo image is required');
    if (file.size > MAX_LOGO_BYTES) throw new BadRequestException('Logo exceeds the 5MB limit');
    if (!ALLOWED_LOGO_MIME_TYPES.has(file.mimetype)) throw new BadRequestException(`Unsupported image type: ${file.mimetype}`);

    const saved = await this.prisma.client.update({
      where: { id },
      data: { logoMimeType: file.mimetype, logoData: file.buffer, updatedBy: userId },
      select: CLIENT_SAFE_SELECT,
    });
    await this.logActivity(id, userId, 'updated_logo', 'Client logo was updated');
    return this.redactFinancials(saved, ctx);
  }

  async getLogo(id: string, userId: string): Promise<{ mimeType: string; data: Buffer }> {
    const ctx = await this.buildContext(id, userId);
    this.assertCanView(ctx);
    const client = await this.prisma.client.findUnique({ where: { id }, select: { id: true, logoMimeType: true, logoData: true } });
    if (!client?.logoData) throw new NotFoundException('This client has no logo');
    return { mimeType: client.logoMimeType ?? 'application/octet-stream', data: Buffer.from(client.logoData) };
  }

  // ==========================================================================
  // Contacts
  // ==========================================================================

  async listContacts(clientId: string, userId: string): Promise<ClientContact[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    return this.prisma.clientContact.findMany({ where: { clientId }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] });
  }

  async addContact(clientId: string, userId: string, dto: ClientContactDto): Promise<ClientContact> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const saved = await this.prisma.clientContact.create({ data: { ...dto, clientId } });
    await this.logActivity(clientId, userId, 'added_contact', `Added contact "${saved.name}"`);
    return saved;
  }

  async updateContact(clientId: string, contactId: string, userId: string, dto: ClientContactDto): Promise<ClientContact> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const contact = await this.prisma.clientContact.findFirst({ where: { id: contactId, clientId } });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.clientContact.update({ where: { id: contactId }, data: dto });
  }

  async removeContact(clientId: string, contactId: string, userId: string): Promise<void> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const result = await this.prisma.clientContact.deleteMany({ where: { id: contactId, clientId } });
    if (!result.count) throw new NotFoundException('Contact not found');
  }

  // ==========================================================================
  // Team
  // ==========================================================================

  async listTeam(clientId: string, userId: string): Promise<(ClientTeamMember & { fullName: string })[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const rows = await this.prisma.clientTeamMember.findMany({ where: { clientId }, orderBy: { createdAt: 'asc' } });
    if (!rows.length) return [];
    const users = await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } } });
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    return rows.map((r) => ({ ...r, fullName: nameById.get(r.userId) ?? 'Unknown' }));
  }

  async assignTeamMember(clientId: string, userId: string, dto: SaveClientTeamMemberDto): Promise<ClientTeamMember> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const existing = await this.prisma.clientTeamMember.findFirst({ where: { clientId, userId: dto.userId } });
    if (existing) throw new BadRequestException('This employee is already assigned to this client');
    const member = await this.prisma.clientTeamMember.create({ data: { ...dto, clientId } });
    const employee = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    await this.logActivity(clientId, userId, 'assigned_team_member', `${employee?.fullName ?? 'An employee'} was assigned as ${dto.role}`);
    return member;
  }

  async updateTeamMember(clientId: string, memberId: string, userId: string, dto: Partial<SaveClientTeamMemberDto>): Promise<ClientTeamMember> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const member = await this.prisma.clientTeamMember.findFirst({ where: { id: memberId, clientId } });
    if (!member) throw new NotFoundException('Team assignment not found');
    return this.prisma.clientTeamMember.update({ where: { id: memberId }, data: dto });
  }

  async removeTeamMember(clientId: string, memberId: string, userId: string): Promise<void> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const result = await this.prisma.clientTeamMember.deleteMany({ where: { id: memberId, clientId } });
    if (!result.count) throw new NotFoundException('Team assignment not found');
  }

  // ==========================================================================
  // Services
  // ==========================================================================

  async listServices(clientId: string, userId: string): Promise<ClientServiceEntity[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    return this.prisma.clientServiceEntity.findMany({ where: { clientId }, orderBy: { createdAt: 'asc' } });
  }

  async addService(clientId: string, userId: string, dto: SaveClientServiceDto): Promise<ClientServiceEntity> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const saved = await this.prisma.clientServiceEntity.create({ data: { ...dto, clientId } as Prisma.ClientServiceEntityCreateInput });
    await this.logActivity(clientId, userId, 'added_service', `Added service "${saved.name}"`);
    return saved;
  }

  async updateService(clientId: string, serviceId: string, userId: string, dto: SaveClientServiceDto): Promise<ClientServiceEntity> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const service = await this.prisma.clientServiceEntity.findFirst({ where: { id: serviceId, clientId } });
    if (!service) throw new NotFoundException('Service not found');
    return this.prisma.clientServiceEntity.update({ where: { id: serviceId }, data: dto as Prisma.ClientServiceEntityUpdateInput });
  }

  async removeService(clientId: string, serviceId: string, userId: string): Promise<void> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const result = await this.prisma.clientServiceEntity.deleteMany({ where: { id: serviceId, clientId } });
    if (!result.count) throw new NotFoundException('Service not found');
  }

  // ==========================================================================
  // Goals
  // ==========================================================================

  async listGoals(clientId: string, userId: string): Promise<ClientGoal[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    return this.prisma.clientGoal.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
  }

  async addGoal(clientId: string, userId: string, dto: SaveClientGoalDto): Promise<ClientGoal> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx); // contributable by any team member
    const saved = await this.prisma.clientGoal.create({ data: { ...dto, clientId } });
    await this.logActivity(clientId, userId, 'added_goal', `Added goal "${saved.name}"`);
    return saved;
  }

  async updateGoal(clientId: string, goalId: string, userId: string, dto: SaveClientGoalDto): Promise<ClientGoal> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const goal = await this.prisma.clientGoal.findFirst({ where: { id: goalId, clientId } });
    if (!goal) throw new NotFoundException('Goal not found');
    this.assertCanEditOwnOrManage(ctx, goal.ownerId ?? '');
    return this.prisma.clientGoal.update({ where: { id: goalId }, data: dto });
  }

  async removeGoal(clientId: string, goalId: string, userId: string): Promise<void> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const result = await this.prisma.clientGoal.deleteMany({ where: { id: goalId, clientId } });
    if (!result.count) throw new NotFoundException('Goal not found');
  }

  // ==========================================================================
  // Assets
  // ==========================================================================

  private visibleAssetsFilter(ctx: AccessContext, assets: SafeAsset[]): SafeAsset[] {
    return ctx.canManage ? assets : assets.filter((a) => !a.isRestricted);
  }

  async listAssets(clientId: string, userId: string): Promise<SafeAsset[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const assets = await this.prisma.clientAsset.findMany({ where: { clientId }, select: ASSET_SAFE_SELECT, orderBy: { createdAt: 'desc' } });
    return this.visibleAssetsFilter(ctx, assets);
  }

  async addAssetLink(clientId: string, userId: string, dto: CreateClientAssetLinkDto): Promise<SafeAsset> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const saved = await this.prisma.clientAsset.create({
      select: ASSET_SAFE_SELECT,
      data: {
        ...dto,
        clientId,
        kind: ClientResourceKind.link,
        uploadedBy: userId,
      },
    });
    await this.logActivity(clientId, userId, 'uploaded_asset', `Linked asset "${saved.name}"`);
    return saved;
  }

  async uploadAsset(clientId: string, userId: string, dto: UploadClientAssetDto, file?: Express.Multer.File): Promise<SafeAsset> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    if (!file) throw new BadRequestException('A file is required');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('File exceeds the 20MB limit');
    if (!ALLOWED_ASSET_MIME_TYPES.has(file.mimetype)) throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);

    const saved = await this.prisma.clientAsset.create({
      select: ASSET_SAFE_SELECT,
      data: {
        name: dto.name,
        folder: dto.folder,
        description: dto.description ?? null,
        tags: parseCsv(dto.tags) ?? undefined,
        version: dto.version ?? null,
        isRestricted: dto.isRestricted === 'true',
        kind: ClientResourceKind.file,
        fileName: file.originalname,
        fileMimeType: file.mimetype,
        fileSize: file.size,
        fileData: file.buffer,
        clientId,
        uploadedBy: userId,
      },
    });
    await this.logActivity(clientId, userId, 'uploaded_asset', `Uploaded asset "${saved.name}"`);
    return saved;
  }

  async removeAsset(clientId: string, assetId: string, userId: string): Promise<void> {
    const ctx = await this.buildContext(clientId, userId);
    const asset = await this.prisma.clientAsset.findFirst({ where: { id: assetId, clientId }, select: ASSET_SAFE_SELECT });
    if (!asset) throw new NotFoundException('Asset not found');
    this.assertCanEditOwnOrManage(ctx, asset.uploadedBy);
    await this.prisma.clientAsset.deleteMany({ where: { id: assetId, clientId } });
  }

  async getAssetFile(clientId: string, assetId: string, userId: string): Promise<{ fileName: string; fileMimeType: string; fileData: Buffer }> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const asset = await this.prisma.clientAsset.findFirst({
      where: { id: assetId, clientId },
      select: { id: true, kind: true, isRestricted: true, fileName: true, fileMimeType: true, fileData: true },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.isRestricted && !ctx.canManage) throw new ForbiddenException('This asset is restricted');
    if (asset.kind !== ClientResourceKind.file || !asset.fileData) throw new NotFoundException('This asset has no file');
    return { fileName: asset.fileName ?? 'download', fileMimeType: asset.fileMimeType ?? 'application/octet-stream', fileData: Buffer.from(asset.fileData) };
  }

  // ==========================================================================
  // Documents
  // ==========================================================================

  async listDocuments(clientId: string, userId: string): Promise<SafeDocument[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const documents = await this.prisma.clientDocument.findMany({ where: { clientId }, select: DOCUMENT_SAFE_SELECT, orderBy: { createdAt: 'desc' } });
    return ctx.canManage ? documents : documents.filter((d) => !d.isConfidential);
  }

  async uploadDocument(clientId: string, userId: string, dto: UploadClientDocumentDto, file?: Express.Multer.File): Promise<SafeDocument> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    if (!file) throw new BadRequestException('A file is required');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('File exceeds the 20MB limit');
    if (!ALLOWED_ASSET_MIME_TYPES.has(file.mimetype)) throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);

    const saved = await this.prisma.clientDocument.create({
      select: DOCUMENT_SAFE_SELECT,
      data: {
        name: dto.name,
        category: dto.category,
        version: dto.version ?? null,
        description: dto.description ?? null,
        isConfidential: dto.isConfidential === 'true',
        fileName: file.originalname,
        fileMimeType: file.mimetype,
        fileSize: file.size,
        fileData: file.buffer,
        clientId,
        uploadedBy: userId,
      },
    });
    await this.logActivity(clientId, userId, 'uploaded_document', `Uploaded document "${saved.name}"`);
    return saved;
  }

  async removeDocument(clientId: string, documentId: string, userId: string): Promise<void> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const result = await this.prisma.clientDocument.deleteMany({ where: { id: documentId, clientId } });
    if (!result.count) throw new NotFoundException('Document not found');
  }

  async getDocumentFile(clientId: string, documentId: string, userId: string): Promise<{ fileName: string; fileMimeType: string; fileData: Buffer }> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const document = await this.prisma.clientDocument.findFirst({
      where: { id: documentId, clientId },
      select: { id: true, isConfidential: true, fileName: true, fileMimeType: true, fileData: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    if (document.isConfidential && !ctx.canManage) throw new ForbiddenException('This document is confidential');
    if (!document.fileData) throw new NotFoundException('This document has no file');
    return { fileName: document.fileName ?? 'download', fileMimeType: document.fileMimeType ?? 'application/octet-stream', fileData: Buffer.from(document.fileData) };
  }

  // ==========================================================================
  // Links
  // ==========================================================================

  async listLinks(clientId: string, userId: string): Promise<ClientLink[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    return this.prisma.clientLink.findMany({ where: { clientId }, orderBy: { createdAt: 'asc' } });
  }

  async addLink(clientId: string, userId: string, dto: SaveClientLinkDto): Promise<ClientLink> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const saved = await this.prisma.clientLink.create({ data: { ...dto, clientId, createdBy: userId } });
    await this.logActivity(clientId, userId, 'added_link', `Added link "${saved.name}"`);
    return saved;
  }

  async removeLink(clientId: string, linkId: string, userId: string): Promise<void> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanManage(ctx);
    const result = await this.prisma.clientLink.deleteMany({ where: { id: linkId, clientId } });
    if (!result.count) throw new NotFoundException('Link not found');
  }

  // ==========================================================================
  // Notes
  // ==========================================================================

  async listNotes(clientId: string, userId: string): Promise<ClientNote[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    return this.prisma.clientNote.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
  }

  async addNote(clientId: string, userId: string, dto: SaveClientNoteDto): Promise<ClientNote> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const saved = await this.prisma.clientNote.create({ data: { ...dto, clientId, createdBy: userId } });
    await this.logActivity(clientId, userId, 'added_note', 'Added an internal note');
    return saved;
  }

  async updateNote(clientId: string, noteId: string, userId: string, dto: SaveClientNoteDto): Promise<ClientNote> {
    const ctx = await this.buildContext(clientId, userId);
    const note = await this.prisma.clientNote.findFirst({ where: { id: noteId, clientId } });
    if (!note) throw new NotFoundException('Note not found');
    this.assertCanEditOwnOrManage(ctx, note.createdBy);
    return this.prisma.clientNote.update({ where: { id: noteId }, data: dto });
  }

  async removeNote(clientId: string, noteId: string, userId: string): Promise<void> {
    const ctx = await this.buildContext(clientId, userId);
    const note = await this.prisma.clientNote.findFirst({ where: { id: noteId, clientId } });
    if (!note) throw new NotFoundException('Note not found');
    this.assertCanEditOwnOrManage(ctx, note.createdBy);
    await this.prisma.clientNote.deleteMany({ where: { id: noteId, clientId } });
  }

  // ==========================================================================
  // Meetings
  // ==========================================================================

  async listMeetings(clientId: string, userId: string): Promise<ClientMeeting[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    return this.prisma.clientMeeting.findMany({ where: { clientId }, orderBy: { date: 'desc' } });
  }

  async addMeeting(clientId: string, userId: string, dto: SaveClientMeetingDto): Promise<ClientMeeting> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const saved = await this.prisma.clientMeeting.create({ data: { ...dto, clientId, createdBy: userId } });
    await this.logActivity(clientId, userId, 'scheduled_meeting', `Added meeting "${saved.title}"`);
    return saved;
  }

  async updateMeeting(clientId: string, meetingId: string, userId: string, dto: SaveClientMeetingDto): Promise<ClientMeeting> {
    const ctx = await this.buildContext(clientId, userId);
    const meeting = await this.prisma.clientMeeting.findFirst({ where: { id: meetingId, clientId } });
    if (!meeting) throw new NotFoundException('Meeting not found');
    this.assertCanEditOwnOrManage(ctx, meeting.createdBy);
    return this.prisma.clientMeeting.update({ where: { id: meetingId }, data: dto });
  }

  async removeMeeting(clientId: string, meetingId: string, userId: string): Promise<void> {
    const ctx = await this.buildContext(clientId, userId);
    const meeting = await this.prisma.clientMeeting.findFirst({ where: { id: meetingId, clientId } });
    if (!meeting) throw new NotFoundException('Meeting not found');
    this.assertCanEditOwnOrManage(ctx, meeting.createdBy);
    await this.prisma.clientMeeting.deleteMany({ where: { id: meetingId, clientId } });
  }

  // ==========================================================================
  // Activity
  // ==========================================================================

  async listActivity(clientId: string, userId: string): Promise<(ClientActivity & { actorName: string })[]> {
    const ctx = await this.buildContext(clientId, userId);
    this.assertCanView(ctx);
    const rows = await this.prisma.clientActivity.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 100 });
    if (!rows.length) return [];
    const actors = await this.prisma.user.findMany({ where: { id: { in: Array.from(new Set(rows.map((r) => r.actorUserId))) } } });
    const nameById = new Map(actors.map((u) => [u.id, u.fullName]));
    return rows.map((r) => ({ ...r, actorName: nameById.get(r.actorUserId) ?? 'Unknown' }));
  }
}

function parseCsv(value?: string): string[] | undefined {
  if (value === undefined) return undefined;
  const items = value.split(',').map((v) => v.trim()).filter(Boolean);
  return items.length ? items : undefined;
}
