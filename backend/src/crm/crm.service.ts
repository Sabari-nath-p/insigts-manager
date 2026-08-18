import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Lead,
  LeadStatus,
  MeetingStatus,
  LeadActivity,
  LeadActivityType,
  LeadSource,
  DailySalesActivity,
  CommissionRule,
  CommissionRuleScope,
  CommissionSalesRole,
  SalesGoal,
  SalesTeamMember,
  User,
  UserRole,
  Client,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
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
import {
  bookingLagDays,
  computeLeadFinancials,
  daysToCollect,
  isBookingLagWarning,
  isDepositAging,
  isFollowUpAging,
  isNoContact,
  percentage,
  primaryAgingStatus,
  round2,
  speedToLeadMinutes,
} from './lead-calculations';
import { leadsToCsv } from './crm-csv';

const KANBAN_STATUSES: LeadStatus[] = [
  LeadStatus.new,
  LeadStatus.proposal,
  LeadStatus.deposit,
  LeadStatus.follow_up_ongoing,
  LeadStatus.meeting_follow_up,
  LeadStatus.won,
  LeadStatus.lost,
];

interface AccessContext {
  lead: Lead;
  requester: User;
  isSuperAdmin: boolean;
  isAssigned: boolean;
  isTeamManager: boolean;
  canView: boolean;
  canManage: boolean; // edit the lead
  canReassign: boolean; // change setter/closer
}

function monthRange(month: string): { from: string; to: string } {
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
  ) {}

  // ==========================================================================
  // Access control
  // ==========================================================================

  private async getUserOrFail(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async getLeadOrFail(id: string): Promise<Lead> {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  private async buildContext(leadId: string, userId: string): Promise<AccessContext> {
    const [lead, requester] = await Promise.all([this.getLeadOrFail(leadId), this.getUserOrFail(userId)]);
    const isSuperAdmin = requester.role === UserRole.super_admin;
    const isAssigned = lead.setterId === userId || lead.closerId === userId;
    let isTeamManager = false;
    if (!isSuperAdmin && requester.role === UserRole.manager) {
      const assigneeIds = [lead.setterId, lead.closerId].filter((id): id is string => !!id);
      if (assigneeIds.length) {
        const assignees = await this.prisma.user.findMany({ where: { id: { in: assigneeIds } } });
        isTeamManager = assignees.some((a) => a.managerId === userId);
      }
    }
    return {
      lead,
      requester,
      isSuperAdmin,
      isAssigned,
      isTeamManager,
      canView: isSuperAdmin || isAssigned || isTeamManager,
      canManage: isSuperAdmin || isAssigned || isTeamManager,
      canReassign: isSuperAdmin || isTeamManager,
    };
  }

  private assertCanView(ctx: AccessContext): void {
    if (!ctx.canView) throw new ForbiddenException('You do not have access to this lead');
  }

  private assertCanManage(ctx: AccessContext): void {
    if (!ctx.canManage) throw new ForbiddenException('You cannot edit this lead');
  }

  /** Every lead a user can see: their own (as setter/closer), their direct reports' if they're a manager, everything if super_admin. */
  private async accessibleLeads(userId: string, extraWhere: Record<string, unknown> = {}): Promise<Lead[]> {
    const requester = await this.getUserOrFail(userId);
    if (requester.role === UserRole.super_admin) {
      return this.prisma.lead.findMany({ where: { isArchived: false, ...extraWhere }, orderBy: { createdAt: 'desc' } });
    }
    let relevantUserIds = [userId];
    if (requester.role === UserRole.manager) {
      const reports = await this.prisma.user.findMany({ where: { managerId: userId } });
      relevantUserIds = [userId, ...reports.map((r) => r.id)];
    }
    const [bySetter, byCloser] = await Promise.all([
      this.prisma.lead.findMany({ where: { setterId: { in: relevantUserIds }, isArchived: false, ...extraWhere } }),
      this.prisma.lead.findMany({ where: { closerId: { in: relevantUserIds }, isArchived: false, ...extraWhere } }),
    ]);
    const byId = new Map<string, Lead>();
    [...bySetter, ...byCloser].forEach((l) => byId.set(l.id, l));
    return Array.from(byId.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  // ==========================================================================
  // Commission resolution (section 11) — never stored, always resolved fresh
  // ==========================================================================

  private async getCommissionRules(): Promise<CommissionRule[]> {
    const rules = await this.prisma.commissionRule.findMany();
    if (!rules.some((r) => r.scope === CommissionRuleScope.default)) {
      const seeded = await this.prisma.commissionRule.create({ data: { scope: CommissionRuleScope.default, percent: '10.00' } });
      rules.push(seeded);
    }
    return rules;
  }

  private resolvePercentFromRules(rules: CommissionRule[], closerId: string | null): number {
    if (closerId) {
      const employeeRule = rules.find((r) => r.scope === CommissionRuleScope.employee && r.userId === closerId);
      if (employeeRule) return Number(employeeRule.percent);
    }
    const roleRule = rules.find((r) => r.scope === CommissionRuleScope.role && r.salesRole === CommissionSalesRole.closer);
    if (roleRule) return Number(roleRule.percent);
    const defaultRule = rules.find((r) => r.scope === CommissionRuleScope.default);
    return defaultRule ? Number(defaultRule.percent) : 10;
  }

  private buildLeadDto(lead: Lead, rules: CommissionRule[]) {
    const commissionPercent = this.resolvePercentFromRules(rules, lead.closerId);
    const financials = computeLeadFinancials(lead, commissionPercent);
    return {
      ...lead,
      ...financials,
      agingStatus: primaryAgingStatus(lead),
      bookingLagDays: bookingLagDays(lead),
      speedToLeadMinutes: speedToLeadMinutes(lead),
    };
  }

  private async toLeadDto(lead: Lead) {
    return this.buildLeadDto(lead, await this.getCommissionRules());
  }

  private async toLeadDtos(leads: Lead[]) {
    const rules = await this.getCommissionRules();
    return leads.map((l) => this.buildLeadDto(l, rules));
  }

  async getCommissionRuleList(): Promise<CommissionRule[]> {
    return this.getCommissionRules();
  }

  async saveCommissionRule(dto: SaveCommissionRuleDto, actorId: string): Promise<CommissionRule> {
    const rules = await this.getCommissionRules();
    let existing: CommissionRule | undefined;
    if (dto.scope === CommissionRuleScope.default) existing = rules.find((r) => r.scope === CommissionRuleScope.default);
    else if (dto.scope === CommissionRuleScope.role) existing = rules.find((r) => r.scope === CommissionRuleScope.role && r.salesRole === dto.salesRole);
    else existing = rules.find((r) => r.scope === CommissionRuleScope.employee && r.userId === dto.userId);

    const percent = dto.percent.toFixed(2);
    if (existing) {
      return this.prisma.commissionRule.update({ where: { id: existing.id }, data: { percent, updatedBy: actorId } });
    }
    return this.prisma.commissionRule.create({
      data: { scope: dto.scope, salesRole: dto.salesRole ?? null, userId: dto.userId ?? null, percent, updatedBy: actorId },
    });
  }

  // ==========================================================================
  // Lead CRUD
  // ==========================================================================

  /**
   * Minimal identifying fields only — a duplicate check runs before access control is
   * established for a brand-new lead, so it must never leak another lead's sales/financial data
   * to whoever is creating this one.
   */
  async checkDuplicate(
    dto: Pick<CreateLeadDto, 'email' | 'phone' | 'companyName' | 'leadName'>,
  ): Promise<Array<{ id: string; leadName: string; companyName: string | null; status: LeadStatus }>> {
    const conditions: Prisma.LeadWhereInput[] = [];
    if (dto.email) conditions.push({ email: dto.email });
    if (dto.phone) conditions.push({ phone: dto.phone });
    if (dto.companyName) conditions.push({ companyName: dto.companyName });
    if (!conditions.length) return [];
    const matches = await this.prisma.lead.findMany({ where: { OR: conditions }, take: 5 });
    return matches.map((m) => ({ id: m.id, leadName: m.leadName, companyName: m.companyName, status: m.status }));
  }

  async createLead(actorId: string, dto: CreateLeadDto) {
    if (!dto.skipDuplicateCheck) {
      const duplicates = await this.checkDuplicate(dto);
      if (duplicates.length) {
        return { possibleDuplicates: duplicates };
      }
    }
    const saved = await this.prisma.lead.create({
      data: {
        leadName: dto.leadName,
        companyName: dto.companyName ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        whatsapp: dto.whatsapp ?? null,
        leadSourceId: dto.leadSourceId ?? null,
        setterId: dto.setterId ?? null,
        closerId: dto.closerId ?? null,
        createdBy: actorId,
      },
    });
    await this.logActivity(saved.id, actorId, LeadActivityType.note, `Lead "${saved.leadName}" created`);
    return { lead: saved };
  }

  async getDetail(leadId: string, userId: string) {
    const ctx = await this.buildContext(leadId, userId);
    this.assertCanView(ctx);
    return this.toLeadDto(ctx.lead);
  }

  async listForUser(
    userId: string,
    filters: {
      status?: LeadStatus;
      setterId?: string;
      closerId?: string;
      leadSourceId?: string;
      meetingStatus?: MeetingStatus;
      offerMade?: string;
      lossReason?: string;
      search?: string;
    } = {},
  ) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.setterId) where.setterId = filters.setterId;
    if (filters.closerId) where.closerId = filters.closerId;
    if (filters.leadSourceId) where.leadSourceId = filters.leadSourceId;
    if (filters.meetingStatus) where.meetingStatus = filters.meetingStatus;
    if (filters.lossReason) where.lossReason = filters.lossReason;

    let leads = await this.accessibleLeads(userId, where);
    if (filters.offerMade !== undefined) {
      const wanted = filters.offerMade === 'true';
      leads = leads.filter((l) => l.offerMade === wanted);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const userIds = Array.from(new Set(leads.flatMap((l) => [l.setterId, l.closerId]).filter((id): id is string => !!id)));
      const users = userIds.length ? await this.prisma.user.findMany({ where: { id: { in: userIds } } }) : [];
      const nameById = new Map(users.map((u) => [u.id, u.fullName.toLowerCase()]));
      leads = leads.filter(
        (l) =>
          l.leadName.toLowerCase().includes(q) ||
          (l.companyName ?? '').toLowerCase().includes(q) ||
          (l.email ?? '').toLowerCase().includes(q) ||
          (l.phone ?? '').includes(q) ||
          (l.setterId && (nameById.get(l.setterId) ?? '').includes(q)) ||
          (l.closerId && (nameById.get(l.closerId) ?? '').includes(q)),
      );
    }
    return this.toLeadDtos(leads);
  }

  async getKanban(userId: string) {
    const leads = await this.toLeadDtos(await this.accessibleLeads(userId));
    const columns = KANBAN_STATUSES.map((status) => ({
      status,
      leads: leads.filter((l) => l.status === status),
    }));
    const active = leads.filter((l) => l.status !== LeadStatus.won && l.status !== LeadStatus.lost);
    const won = leads.filter((l) => l.status === LeadStatus.won);
    const summary = {
      totalLeads: leads.length,
      counts: Object.fromEntries(KANBAN_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length])),
      pipelineValue: round2(active.reduce((sum, l) => sum + l.dealValue, 0)),
      wonRevenue: round2(won.reduce((sum, l) => sum + l.netRevenue, 0)),
    };
    return { columns, summary };
  }

  private trackChanges(before: Lead, after: Record<string, unknown>): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
    for (const [field, newValue] of Object.entries(after)) {
      const oldValue = (before as unknown as Record<string, unknown>)[field];
      const oldStr = oldValue == null ? null : String(oldValue);
      const newStr = newValue == null ? null : String(newValue);
      if (oldStr !== newStr) changes.push({ field, oldValue, newValue });
    }
    return changes;
  }

  async updateLead(leadId: string, userId: string, dto: UpdateLeadDto): Promise<Lead> {
    const ctx = await this.buildContext(leadId, userId);
    this.assertCanManage(ctx);
    const lead = ctx.lead;

    const nextStatus = dto.status ?? lead.status;
    const nextDealValue = dto.dealValue !== undefined ? dto.dealValue : lead.dealValue != null ? Number(lead.dealValue) : null;
    const nextLossReason = dto.lossReason !== undefined ? dto.lossReason : lead.lossReason;
    const nextRefund = dto.refundAmount !== undefined ? dto.refundAmount : Number(lead.refundAmount);

    if (nextStatus === LeadStatus.won && !nextDealValue) {
      throw new BadRequestException('A lead cannot be marked Won without a deal value');
    }
    if (nextStatus === LeadStatus.lost && !nextLossReason) {
      throw new BadRequestException('A lead cannot be marked Lost without a loss reason');
    }
    if (dto.paidInFullAt && !dto.depositPaidAt && !lead.depositPaidAt && !lead.dealValue) {
      throw new BadRequestException('Cannot mark paid in full without deal information');
    }
    if (nextDealValue != null && nextRefund > nextDealValue) {
      throw new BadRequestException('Refund amount cannot exceed the deal value');
    }
    const nextMeetingBooked = dto.meetingBookedAt ?? lead.meetingBookedAt;
    const nextMeetingDate = dto.meetingDate ?? lead.meetingDate;
    if (nextMeetingBooked && nextMeetingDate && new Date(nextMeetingDate) < new Date(nextMeetingBooked)) {
      throw new BadRequestException('Meeting date cannot be before the date the meeting was booked');
    }

    const patch: Record<string, unknown> = { ...dto };
    delete patch.dealValue;
    delete patch.depositAmount;
    delete patch.cashCollected;
    delete patch.refundAmount;
    delete patch.commissionOverridePercent;
    if (dto.dealValue !== undefined) patch.dealValue = dto.dealValue.toFixed(2);
    if (dto.depositAmount !== undefined) patch.depositAmount = dto.depositAmount.toFixed(2);
    if (dto.cashCollected !== undefined) patch.cashCollected = dto.cashCollected.toFixed(2);
    if (dto.refundAmount !== undefined) patch.refundAmount = dto.refundAmount.toFixed(2);
    if (dto.commissionOverridePercent !== undefined) patch.commissionOverridePercent = dto.commissionOverridePercent.toFixed(2);

    // Auto-timestamps (section 6) — set once, never overwritten by a later save.
    if (dto.firstContactAt) patch.firstContactAt = new Date(dto.firstContactAt);
    if (dto.meetingBookedAt) patch.meetingBookedAt = new Date(dto.meetingBookedAt);
    if (dto.lastTouchAt) patch.lastTouchAt = new Date(dto.lastTouchAt);
    if (dto.status === LeadStatus.won && !lead.wonAt) patch.wonAt = new Date();
    if (dto.status === LeadStatus.lost && !lead.lostAt) patch.lostAt = new Date();

    const changes = this.trackChanges(lead, patch);
    const saved = await this.prisma.lead.update({ where: { id: leadId }, data: patch as Prisma.LeadUpdateInput });

    for (const change of changes) {
      const isStatus = change.field === 'status';
      await this.logActivity(
        leadId,
        userId,
        isStatus ? LeadActivityType.status_change : LeadActivityType.field_change,
        isStatus
          ? `Status changed from ${change.oldValue ?? '—'} to ${change.newValue ?? '—'}`
          : `${change.field} changed`,
        change.oldValue == null ? null : String(change.oldValue),
        change.newValue == null ? null : String(change.newValue),
      );
    }
    return saved;
  }

  async assignLead(leadId: string, userId: string, dto: AssignLeadDto): Promise<Lead> {
    const ctx = await this.buildContext(leadId, userId);
    if (!ctx.canReassign) throw new ForbiddenException('Only a super admin or the team manager can reassign a lead');
    const changes = this.trackChanges(ctx.lead, dto as Record<string, unknown>);
    const saved = await this.prisma.lead.update({ where: { id: leadId }, data: dto });
    for (const change of changes) {
      await this.logActivity(
        leadId,
        userId,
        LeadActivityType.field_change,
        `${change.field} reassigned`,
        change.oldValue == null ? null : String(change.oldValue),
        change.newValue == null ? null : String(change.newValue),
      );
    }
    return saved;
  }

  async archiveLead(leadId: string, userId: string): Promise<Lead> {
    const ctx = await this.buildContext(leadId, userId);
    this.assertCanManage(ctx);
    const saved = await this.prisma.lead.update({ where: { id: leadId }, data: { isArchived: true } });
    await this.logActivity(leadId, userId, LeadActivityType.other, 'Lead archived');
    return saved;
  }

  async hardDeleteLead(leadId: string, actorId: string, typedLeadName: string): Promise<void> {
    const lead = await this.getLeadOrFail(leadId);
    if (typedLeadName.trim() !== lead.leadName) {
      throw new BadRequestException('Typed lead name does not match — deletion cancelled');
    }
    await this.prisma.leadActivity.deleteMany({ where: { leadId } });
    await this.prisma.lead.delete({ where: { id: leadId } });
  }

  // ==========================================================================
  // Activity timeline
  // ==========================================================================

  private logActivity(
    leadId: string,
    actorId: string,
    type: LeadActivityType,
    description: string,
    previousValue: string | null = null,
    newValue: string | null = null,
  ): Promise<LeadActivity> {
    return this.prisma.leadActivity.create({ data: { leadId, actorId, type, description, previousValue, newValue } });
  }

  async addActivity(leadId: string, userId: string, dto: AddLeadActivityDto): Promise<LeadActivity> {
    const ctx = await this.buildContext(leadId, userId);
    this.assertCanView(ctx);
    const activity = await this.logActivity(leadId, userId, dto.type, dto.description);
    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        lastTouchAt: new Date(),
        followUpCount: dto.type === LeadActivityType.follow_up ? ctx.lead.followUpCount + 1 : undefined,
      },
    });
    return activity;
  }

  async listActivity(leadId: string, userId: string): Promise<LeadActivity[]> {
    const ctx = await this.buildContext(leadId, userId);
    this.assertCanView(ctx);
    return this.prisma.leadActivity.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' } });
  }

  // ==========================================================================
  // Convert to Client (sections 42-44)
  // ==========================================================================

  /** Client has no top-level email/phone (those live on ClientContact) — match by name instead. */
  async findPossibleClientMatches(lead: Lead): Promise<Client[]> {
    const conditions: Prisma.ClientWhereInput[] = [];
    if (lead.companyName) conditions.push({ companyName: lead.companyName });
    conditions.push({ clientName: lead.leadName });
    return this.prisma.client.findMany({ where: { OR: conditions }, take: 5 });
  }

  async convertToClient(leadId: string, userId: string, dto: ConvertLeadDto) {
    const ctx = await this.buildContext(leadId, userId);
    this.assertCanManage(ctx);
    const lead = ctx.lead;
    if (lead.status !== LeadStatus.won) {
      throw new BadRequestException('Only a Won lead can be converted to a client');
    }
    if (lead.clientId) {
      throw new ConflictException('This lead has already been converted to a client');
    }

    if (dto.linkToClientId) {
      await this.prisma.lead.update({ where: { id: leadId }, data: { clientId: dto.linkToClientId } });
      await this.logActivity(leadId, userId, LeadActivityType.other, 'Linked to an existing client record');
      return { client: await this.prisma.client.findUnique({ where: { id: dto.linkToClientId } }), linkedExisting: true };
    }

    if (!dto.confirmCreateAnyway) {
      const possibleMatches = await this.findPossibleClientMatches(lead);
      if (possibleMatches.length) {
        return { possibleDuplicateClients: possibleMatches };
      }
    }

    const client = await this.clientsService.create(userId, {
      clientName: lead.leadName,
      companyName: lead.companyName ?? undefined,
      accountManagerId: lead.closerId ?? userId,
      contacts: [
        {
          name: lead.leadName,
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          whatsapp: lead.whatsapp ?? undefined,
          isPrimary: true,
        },
      ],
    });
    await this.prisma.lead.update({ where: { id: leadId }, data: { clientId: client.id } });
    await this.logActivity(leadId, userId, LeadActivityType.other, `Converted to client "${client.clientName}"`);
    return { client, linkedExisting: false };
  }

  // ==========================================================================
  // Lead sources
  // ==========================================================================

  listSources(): Promise<LeadSource[]> {
    return this.prisma.leadSource.findMany({ orderBy: { name: 'asc' } });
  }

  async saveSource(dto: SaveLeadSourceDto, id?: string): Promise<LeadSource> {
    if (id) {
      const source = await this.prisma.leadSource.findUnique({ where: { id } });
      if (!source) throw new NotFoundException('Lead source not found');
      return this.prisma.leadSource.update({ where: { id }, data: dto });
    }
    return this.prisma.leadSource.create({ data: dto });
  }

  // ==========================================================================
  // Daily setter activity (section 48)
  // ==========================================================================

  async saveDailyActivity(userId: string, dto: SaveDailyActivityDto): Promise<DailySalesActivity> {
    return this.prisma.dailySalesActivity.upsert({
      where: { userId_date: { userId, date: dto.date } },
      create: { userId, date: dto.date, dials: dto.dials, dmsSent: dto.dmsSent, conversations: dto.conversations, notes: dto.notes ?? null },
      update: { dials: dto.dials, dmsSent: dto.dmsSent, conversations: dto.conversations, notes: dto.notes ?? null },
    });
  }

  listMyDailyActivity(userId: string): Promise<DailySalesActivity[]> {
    return this.prisma.dailySalesActivity.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 30 });
  }

  // ==========================================================================
  // Sales team
  // ==========================================================================

  listTeam(): Promise<SalesTeamMember[]> {
    return this.prisma.salesTeamMember.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async saveTeamMember(dto: SaveSalesTeamMemberDto, actorId: string): Promise<SalesTeamMember> {
    return this.prisma.salesTeamMember.upsert({
      where: { userId: dto.userId },
      create: { userId: dto.userId, salesRole: dto.salesRole, isActive: dto.isActive ?? true, addedBy: actorId },
      update: { salesRole: dto.salesRole, isActive: dto.isActive ?? true },
    });
  }

  async isSalesTeamMember(userId: string): Promise<boolean> {
    const count = await this.prisma.salesTeamMember.count({ where: { userId, isActive: true } });
    return count > 0;
  }

  // ==========================================================================
  // Sales goals
  // ==========================================================================

  async getGoal(period: string): Promise<SalesGoal | null> {
    return this.prisma.salesGoal.findUnique({ where: { period } });
  }

  async setGoal(dto: SaveSalesGoalDto, actorId: string): Promise<SalesGoal> {
    return this.prisma.salesGoal.upsert({
      where: { period: dto.period },
      create: { period: dto.period, revenueGoalAmount: dto.revenueGoalAmount.toFixed(2), setBy: actorId },
      update: { revenueGoalAmount: dto.revenueGoalAmount.toFixed(2), setBy: actorId },
    });
  }

  // ==========================================================================
  // Dashboard (sections 21-32)
  // ==========================================================================

  async getDashboard(userId: string, filters: { from?: string; to?: string; setterId?: string; closerId?: string; leadSourceId?: string } = {}) {
    let leads = await this.accessibleLeads(userId);
    if (filters.setterId) leads = leads.filter((l) => l.setterId === filters.setterId);
    if (filters.closerId) leads = leads.filter((l) => l.closerId === filters.closerId);
    if (filters.leadSourceId) leads = leads.filter((l) => l.leadSourceId === filters.leadSourceId);
    if (filters.from) leads = leads.filter((l) => l.createdAt >= new Date(filters.from!));
    if (filters.to) leads = leads.filter((l) => l.createdAt <= new Date(`${filters.to}T23:59:59`));

    const rules = await this.getCommissionRules();
    const dtos = leads.map((l) => this.buildLeadDto(l, rules));

    const meetingsScheduled = leads.filter((l) => l.meetingDate);
    const callsTaken = leads.filter((l) => l.meetingStatus === MeetingStatus.show);
    const noShows = leads.filter((l) => l.meetingStatus === MeetingStatus.no_show);
    const cancels = leads.filter((l) => l.meetingStatus === MeetingStatus.cancel);
    const rescheduled = leads.filter(
      (l) => l.meetingStatus === MeetingStatus.rescheduled_by_us || l.meetingStatus === MeetingStatus.rescheduled_by_them,
    );
    const dqs = leads.filter((l) => l.meetingStatus === MeetingStatus.dq);
    const offers = callsTaken.filter((l) => l.offerMade === true);
    const sales = leads.filter((l) => l.status === LeadStatus.won);
    const oneCallSales = sales.filter((l) => l.saleType === 'one_call');
    const followUpSales = sales.filter((l) => l.saleType === 'follow_up');

    const speedToLeadValues = leads.map((l) => speedToLeadMinutes(l)).filter((v): v is number => v != null);
    const bookingLagValues = leads.map((l) => bookingLagDays(l)).filter((v): v is number => v != null);

    const saleDtos = dtos.filter((d) => d.status === LeadStatus.won);
    const totalRevenue = round2(saleDtos.reduce((s, d) => s + d.dealValue, 0));
    const totalRefunds = round2(saleDtos.reduce((s, d) => s + d.refundAmount, 0));
    const netRevenue = round2(totalRevenue - totalRefunds);
    const cashCollected = round2(dtos.reduce((s, d) => s + Number(d.cashCollected), 0));
    const totalDeposits = round2(dtos.reduce((s, d) => s + Number(d.depositAmount), 0));

    const dealsWithDeposit = leads.filter((l) => Number(l.depositAmount) > 0);
    const dealsPaidInFull = leads.filter((l) => !!l.paidInFullAt);
    const daysToCollectValues = leads.map((l) => daysToCollect(l)).filter((v): v is number => v != null);

    const lossCounts: Record<string, number> = {};
    const lostLeads = leads.filter((l) => l.status === LeadStatus.lost);
    for (const l of lostLeads) {
      const reason = l.lossReason ?? 'unspecified';
      lossCounts[reason] = (lossCounts[reason] ?? 0) + 1;
    }

    const now = new Date();
    const followUpOngoing = leads.filter((l) => l.status === LeadStatus.follow_up_ongoing);
    const agingBuckets = { d0_3: 0, d4_6: 0, d7_13: 0, d14_plus: 0 };
    for (const l of followUpOngoing) {
      if (!l.lastTouchAt) continue;
      const days = Math.floor((now.getTime() - new Date(l.lastTouchAt).getTime()) / (24 * 60 * 60 * 1000));
      if (days <= 3) agingBuckets.d0_3 += 1;
      else if (days <= 6) agingBuckets.d4_6 += 1;
      else if (days <= 13) agingBuckets.d7_13 += 1;
      else agingBuckets.d14_plus += 1;
    }

    return {
      pipeline: {
        totalLeads: leads.length,
        counts: Object.fromEntries(KANBAN_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length])),
      },
      setterMetrics: {
        speedToLeadAvgMinutes: speedToLeadValues.length ? round2(speedToLeadValues.reduce((a, b) => a + b, 0) / speedToLeadValues.length) : null,
        bookingLagAvgDays: bookingLagValues.length ? round2(bookingLagValues.reduce((a, b) => a + b, 0) / bookingLagValues.length) : null,
      },
      meetingMetrics: {
        callsScheduled: meetingsScheduled.length,
        callsTaken: callsTaken.length,
        noShows: noShows.length,
        cancels: cancels.length,
        rescheduled: rescheduled.length,
        dqs: dqs.length,
        showUpRate: percentage(callsTaken.length, meetingsScheduled.length),
        dqRate: percentage(dqs.length, meetingsScheduled.length),
      },
      closerMetrics: {
        offersMade: offers.length,
        offerRate: percentage(offers.length, callsTaken.length),
        totalSales: sales.length,
        closeRate: percentage(sales.length, callsTaken.length),
        closeRateOnOffers: percentage(sales.length, offers.length),
      },
      saleTypeMetrics: {
        oneCallSales: { count: oneCallSales.length, percentage: percentage(oneCallSales.length, sales.length) },
        followUpSales: { count: followUpSales.length, percentage: percentage(followUpSales.length, sales.length) },
        totalSales: sales.length,
      },
      dealMetrics: {
        averageDealSize: sales.length ? round2(totalRevenue / sales.length) : 0,
        revenuePerCallTaken: callsTaken.length ? round2(totalRevenue / callsTaken.length) : 0,
      },
      lossAnalytics: Object.entries(lossCounts).map(([reason, count]) => ({
        reason,
        count,
        percentage: percentage(count, lostLeads.length),
      })),
      followUpAging: {
        totalFollowUpDeals: followUpOngoing.length,
        ...agingBuckets,
      },
      money: {
        totalDeposits,
        totalSales: sales.length,
        revenueGenerated: totalRevenue,
        cashCollected,
        refunds: totalRefunds,
        netRevenue,
      },
      paymentConversion: {
        depositToPaidInFullPercent: percentage(dealsPaidInFull.length, dealsWithDeposit.length),
        averageDaysToCollect: daysToCollectValues.length
          ? round2(daysToCollectValues.reduce((a, b) => a + b, 0) / daysToCollectValues.length)
          : null,
      },
    };
  }

  async getCommissionsDashboard(userId: string, filters: { from?: string; to?: string } = {}) {
    let leads = (await this.accessibleLeads(userId)).filter((l) => l.status === LeadStatus.won);
    if (filters.from) leads = leads.filter((l) => l.createdAt >= new Date(filters.from!));
    if (filters.to) leads = leads.filter((l) => l.createdAt <= new Date(`${filters.to}T23:59:59`));

    const rules = await this.getCommissionRules();
    const closerIds = Array.from(new Set(leads.map((l) => l.closerId).filter((id): id is string => !!id)));
    const closers = closerIds.length ? await this.prisma.user.findMany({ where: { id: { in: closerIds } } }) : [];
    const nameById = new Map(closers.map((c) => [c.id, c.fullName]));

    const byCloser = new Map<string, { totalSales: number; revenue: number; refunds: number; netRevenue: number; commissionEarned: number; percent: number }>();
    for (const lead of leads) {
      if (!lead.closerId) continue;
      const dto = this.buildLeadDto(lead, rules);
      const bucket = byCloser.get(lead.closerId) ?? { totalSales: 0, revenue: 0, refunds: 0, netRevenue: 0, commissionEarned: 0, percent: dto.resolvedCommissionPercent };
      bucket.totalSales += 1;
      bucket.revenue = round2(bucket.revenue + dto.dealValue);
      bucket.refunds = round2(bucket.refunds + dto.refundAmount);
      bucket.netRevenue = round2(bucket.netRevenue + dto.netRevenue);
      bucket.commissionEarned = round2(bucket.commissionEarned + dto.earnings);
      byCloser.set(lead.closerId, bucket);
    }

    return Array.from(byCloser.entries()).map(([closerId, bucket]) => ({
      closerId,
      closerName: nameById.get(closerId) ?? 'Unknown',
      ...bucket,
    }));
  }

  async getMySales(userId: string) {
    const leads = await this.prisma.lead.findMany({ where: { OR: [{ setterId: userId }, { closerId: userId }] } });
    const rules = await this.getCommissionRules();
    const dtos = leads.map((l) => this.buildLeadDto(l, rules));
    const mySales = dtos.filter((d) => d.status === LeadStatus.won && d.closerId === userId);
    const myMeetings = dtos.filter((d) => d.meetingDate);
    const myCallsTaken = dtos.filter((d) => d.meetingStatus === MeetingStatus.show);
    const myOffers = myCallsTaken.filter((d) => d.offerMade === true);
    const myAgingLeads = dtos.filter((d) => d.agingStatus != null);

    return {
      myLeadsCount: dtos.length,
      myMeetingsCount: myMeetings.length,
      myCallsTaken: myCallsTaken.length,
      myOffers: myOffers.length,
      mySalesCount: mySales.length,
      myFollowUpsCount: dtos.filter((d) => d.status === LeadStatus.follow_up_ongoing).length,
      myRevenue: round2(mySales.reduce((s, d) => s + d.dealValue, 0)),
      myCommission: round2(mySales.reduce((s, d) => s + d.earnings, 0)),
      myCloseRate: percentage(mySales.length, myCallsTaken.length),
      myShowUpRate: percentage(myCallsTaken.length, myMeetings.length),
      myAgingLeads,
    };
  }

  // ==========================================================================
  // Sales leaks (section 39)
  // ==========================================================================

  async getSalesLeaks(userId: string) {
    const leads = await this.accessibleLeads(userId);
    const rules = await this.getCommissionRules();
    const dtos = leads.map((l) => this.buildLeadDto(l, rules));

    return {
      bookingLag: dtos.filter((d) => isBookingLagWarning(d)),
      followUpAging: dtos.filter((d) => isFollowUpAging(d)),
      depositAging: dtos.filter((d) => isDepositAging(d)),
      noContact: dtos.filter((d) => isNoContact(d)),
      unworkedLeads: dtos.filter((d) => d.status === LeadStatus.new && !d.firstContactAt),
      noShowFollowUp: dtos.filter((d) => d.meetingStatus === MeetingStatus.no_show && d.status !== LeadStatus.lost && !d.nextFollowUpDate),
      proposalStagnation: dtos.filter(
        (d) => d.status === LeadStatus.proposal && d.lastTouchAt && isFollowUpAgingLike(d.lastTouchAt),
      ),
    };
  }

  // ==========================================================================
  // Projection (sections 34-38, 61)
  // ==========================================================================

  async getProjection(
    userId: string,
    month: string,
    scenarioOverrides: { bestMultiplier?: number; worstMultiplier?: number } = {},
  ) {
    const leads = await this.accessibleLeads(userId);
    const { to } = monthRange(month);
    const today = new Date();
    const monthEnd = new Date(`${to}T23:59:59`);

    const closedForBaseline = leads.filter((l) => l.meetingStatus != null);
    const scheduled = closedForBaseline.length;
    const shows = closedForBaseline.filter((l) => l.meetingStatus === MeetingStatus.show).length;
    const offers = closedForBaseline.filter((l) => l.meetingStatus === MeetingStatus.show && l.offerMade === true).length;
    const won = leads.filter((l) => l.status === LeadStatus.won);
    const wonWithOffer = won.filter((l) => l.offerMade === true).length;

    const baseline = {
      showUpRate: scheduled ? percentage(shows, scheduled) : 50,
      offerRate: shows ? percentage(offers, shows) : 50,
      closeRateOnOffers: offers ? percentage(wonWithOffer, offers) : 25,
      avgDealSize: won.length ? round2(won.reduce((s, l) => s + Number(l.dealValue ?? 0), 0) / won.length) : 0,
    };

    const meetingsRemaining = leads.filter(
      (l) =>
        l.meetingDate &&
        new Date(`${l.meetingDate}T00:00:00`) >= today &&
        new Date(`${l.meetingDate}T00:00:00`) <= monthEnd &&
        l.status !== LeadStatus.won &&
        l.status !== LeadStatus.lost &&
        l.meetingStatus !== MeetingStatus.cancel &&
        l.meetingStatus !== MeetingStatus.dq,
    ).length;

    const bestMult = scenarioOverrides.bestMultiplier ?? 1.15;
    const worstMult = scenarioOverrides.worstMultiplier ?? 0.75;

    const buildScenario = (mult: number) => {
      const showUpRate = Math.min(100, round2(baseline.showUpRate * mult));
      const offerRate = Math.min(100, round2(baseline.offerRate * mult));
      const closeRateOnOffers = Math.min(100, round2(baseline.closeRateOnOffers * mult));
      const avgDealSize = round2(baseline.avgDealSize * (mult >= 1 ? Math.min(mult, 1.1) : mult));
      const expectedCalls = round2(meetingsRemaining * (showUpRate / 100));
      const expectedOffers = round2(expectedCalls * (offerRate / 100));
      const projectedSales = round2(expectedOffers * (closeRateOnOffers / 100));
      const projectedRevenue = round2(projectedSales * avgDealSize);
      return {
        assumptions: { meetingsRemaining, showUpRate, offerRate, closeRateOnOffers, avgDealSize },
        expectedCalls,
        expectedOffers,
        projectedSales,
        projectedRevenue,
      };
    };

    const goal = await this.getGoal(month);
    const netRevenueSoFar = round2(
      won.reduce((s, l) => s + Number(l.dealValue ?? 0), 0) - won.reduce((s, l) => s + Number(l.refundAmount ?? 0), 0),
    );

    const expected = buildScenario(1);
    const goalAmount = goal ? Number(goal.revenueGoalAmount) : null;
    const forecastTotal = round2(netRevenueSoFar + expected.projectedRevenue);

    return {
      month,
      best: buildScenario(bestMult),
      expected,
      worst: buildScenario(worstMult),
      goal: goalAmount,
      currentNetRevenue: netRevenueSoFar,
      remaining: goalAmount != null ? round2(goalAmount - netRevenueSoFar) : null,
      expectedForecastTotal: forecastTotal,
      forecastVsGoal: goalAmount != null ? round2(forecastTotal - goalAmount) : null,
    };
  }

  // ==========================================================================
  // Export
  // ==========================================================================

  async exportLeadLog(userId: string): Promise<string> {
    const leads = await this.listForUser(userId);
    const userIds = Array.from(new Set(leads.flatMap((l) => [l.setterId, l.closerId]).filter((id): id is string => !!id)));
    const users = userIds.length ? await this.prisma.user.findMany({ where: { id: { in: userIds } } }) : [];
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    return leadsToCsv(leads, nameById);
  }
}

/** A light aging check used only for Proposal-stage stagnation (section 39), same 7-day window as follow-up aging. */
function isFollowUpAgingLike(lastTouchAt: Date | string): boolean {
  const days = Math.floor((Date.now() - new Date(lastTouchAt).getTime()) / (24 * 60 * 60 * 1000));
  return days >= 7;
}
